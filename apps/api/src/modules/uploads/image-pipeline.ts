import sharp from 'sharp';

/**
 * What every uploaded image goes through before it is stored (#189).
 *
 * Four things, and the order of the middle two is the part that is easy to get wrong.
 *
 * **1. Decode, to find out what this actually is.**
 * The format is read from the bytes, never from what the caller said. `uploads.service.ts` used
 * to trust `request.mimeType` — a field in the JSON body — while the platform standard claimed
 * the type was "sniffed server-side". It was not. A decoder settles it: either the bytes are an
 * image of some format, or they are not an image.
 *
 * **2. Apply the orientation, THEN strip the metadata.**
 * A phone records which way up it was held as an EXIF tag rather than by rotating the pixels.
 * Strip first and every portrait photo comes out sideways, because the instruction was in the
 * data that was removed. `.rotate()` with no argument applies that tag and then discards it.
 *
 * **3. Strip everything else with it — the point of the exercise.**
 * Phone photos carry GPS coordinates and a capture timestamp. A public experience log would
 * otherwise publish where and when a picture was taken, which nobody chose and most people do
 * not know is there. sharp keeps no metadata unless asked, so this is the default rather than a
 * step that can be forgotten.
 *
 * **4. Downscale, and re-encode to one format per class.**
 * A 12MP photo is several megabytes and nothing in a reflection needs that — and since #178
 * private images stream through the api, every byte is api bandwidth rather than storage egress.
 */

/** Longest edge, in pixels. A judgement, not a measurement: comfortably past any display size
 *  in the product while cutting a phone photo by roughly an order of magnitude. */
const MAX_DIMENSION = 2048;

/** Formats we are willing to store. Anything else is re-encoded to one of them. */
const OUTPUT = {
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
  png: { ext: 'png', contentType: 'image/png' },
  webp: { ext: 'webp', contentType: 'image/webp' },
  gif: { ext: 'gif', contentType: 'image/gif' },
} as const;

export type ProcessedImage = {
  body: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
};

export class NotAnImageError extends Error {
  constructor(cause?: unknown) {
    super('The uploaded file is not an image we can read');
    this.cause = cause;
  }
}

/**
 * Decodes, corrects, strips and resizes. Throws `NotAnImageError` for anything that is not a
 * readable image — which is the format check, rather than a separate one that could disagree.
 */
export async function processUploadedImage(input: Buffer): Promise<ProcessedImage> {
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch (error) {
    throw new NotAnImageError(error);
  }

  const format = metadata.format;
  if (!format || !(format in OUTPUT)) {
    // Decoded, but into something we do not serve — a TIFF or a PDF page, say. Re-encoding it to
    // JPEG would silently change what somebody uploaded, so refuse instead.
    throw new NotAnImageError(new Error(`unsupported format: ${format ?? 'unknown'}`));
  }
  const target = OUTPUT[format as keyof typeof OUTPUT];

  // Animation would be lost by a plain re-encode, so animated GIF and WebP keep every frame.
  const animated = (metadata.pages ?? 1) > 1;

  let pipeline = sharp(input, { animated })
    // Applies the EXIF orientation and drops the tag. Must precede any resize, or the image is
    // scaled along the wrong axes.
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      // Never scale a small image up: it would cost bytes and add nothing.
      withoutEnlargement: true,
    });

  // Re-encode in the format it already was. Converting everything to one format would turn a
  // screenshot with flat colour and sharp text into a blurry JPEG.
  if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  else if (format === 'png') pipeline = pipeline.png({ compressionLevel: 9 });
  else if (format === 'webp') pipeline = pipeline.webp({ quality: 82 });
  else pipeline = pipeline.gif();

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    body: data,
    contentType: target.contentType,
    extension: target.ext,
    width: info.width,
    height: info.height,
  };
}
