export async function downloadDiagram({
  url,
  title,
  width,
  height,
  format,
}: {
  url: string;
  title: string;
  width: number;
  height: number;
  format: 'png' | 'svg';
}) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Diagram could not be loaded for export.');
  let svg = await response.text();
  // Explicit intrinsic size is required by Safari when decoding SVG Blob URLs.
  svg = svg.replace('<svg ', `<svg width="${width}" height="${height}" `);
  const vector = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  let blob = vector;
  if (format === 'png') {
    const source = URL.createObjectURL(vector);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const scale = Math.min(
        2,
        16384 / width,
        16384 / height,
        Math.sqrt(32_000_000 / (width * height)),
      );
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('PNG export is unavailable in this browser.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error('PNG export failed. Try SVG download.')),
          'image/png',
        ),
      );
    } finally {
      URL.revokeObjectURL(source);
    }
  }
  const link = document.createElement('a'),
    download = URL.createObjectURL(blob);
  link.href = download;
  link.download =
    (title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '') || 'diagram') +
    '.' +
    format;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(download), 30_000);
}
