import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processUploadedImage, NotAnImageError } from './image-pipeline';

/** A real JPEG carrying real EXIF, including GPS. Built rather than fixtured so the test states
 *  exactly what it is asserting is removed. */
async function jpegWithGps(width = 100, height = 60): Promise<Buffer> {
  return (
    sharp({
      create: { width, height, channels: 3, background: { r: 120, g: 80, b: 40 } },
    })
      // Cast: sharp's `Exif` type names only the IFD blocks it knows, and GPS is exactly the block
      // this test exists to prove is removed. libvips writes it correctly at runtime.
      .withExif({
        IFD0: { Make: 'TestPhone', Model: 'TestModel' },
        GPS: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '18/1 31/1 0/1', // Pune
          GPSLongitudeRef: 'E',
          GPSLongitude: '73/1 51/1 0/1',
        },
      } as unknown as sharp.Exif)
      .jpeg()
      .toBuffer()
  );
}

describe('processUploadedImage — what leaves the pipeline', () => {
  it('REMOVES GPS coordinates, which is the point of the exercise', async () => {
    const withGps = await jpegWithGps();
    // Confirm the fixture really carries them — otherwise this test could pass by accident.
    expect((await sharp(withGps).metadata()).exif).toBeDefined();

    const result = await processUploadedImage(withGps);
    const after = await sharp(result.body).metadata();

    expect(after.exif).toBeUndefined();
  });

  it('removes camera make and model too, not only location', async () => {
    const result = await processUploadedImage(await jpegWithGps());
    // Nothing identifying the device should survive; sharp keeps no metadata unless asked.
    expect((await sharp(result.body).metadata()).exif).toBeUndefined();
  });

  it('downscales an oversized image and keeps its proportions', async () => {
    const big = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .jpeg()
      .toBuffer();

    const result = await processUploadedImage(big);

    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(2048);
    // 4:3 in, 4:3 out.
    expect(result.width / result.height).toBeCloseTo(4 / 3, 2);
  });

  it('does NOT enlarge a small image', async () => {
    const small = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();

    const result = await processUploadedImage(small);

    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
  });

  it('reports the format from the BYTES, not from anything a caller claimed', async () => {
    // This is what replaces trusting `request.mimeType`. A PNG is a PNG because it decodes as
    // one, whatever the upload said.
    const png = await sharp({
      create: { width: 20, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const result = await processUploadedImage(png);

    expect(result.contentType).toBe('image/png');
    expect(result.extension).toBe('png');
  });

  it('keeps a screenshot as PNG rather than flattening it to JPEG', async () => {
    // Re-encoding everything to one format would turn flat colour and sharp text into a blurry
    // JPEG. Format in, format out.
    const png = await sharp({
      create: { width: 300, height: 200, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .png()
      .toBuffer();

    expect((await processUploadedImage(png)).contentType).toBe('image/png');
  });

  it('refuses bytes that are not an image at all', async () => {
    await expect(
      processUploadedImage(Buffer.from('not an image, just text')),
    ).rejects.toBeInstanceOf(NotAnImageError);
  });

  it('refuses an image in a format we do not serve, rather than silently converting it', async () => {
    // A TIFF decodes perfectly well. Re-encoding it to JPEG would change what somebody uploaded
    // without saying so, so it is refused instead.
    const tiff = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 5, g: 5, b: 5 } },
    })
      .tiff()
      .toBuffer();

    await expect(processUploadedImage(tiff)).rejects.toBeInstanceOf(NotAnImageError);
  });

  it('produces a smaller file for a large photo', async () => {
    const big = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: { r: 90, g: 140, b: 200 } },
    })
      .jpeg({ quality: 100 })
      .toBuffer();

    const result = await processUploadedImage(big);

    expect(result.body.byteLength).toBeLessThan(big.byteLength);
  });
});
