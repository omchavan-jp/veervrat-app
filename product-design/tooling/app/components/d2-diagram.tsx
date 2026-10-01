import { ImageZoom } from 'fumadocs-ui/components/image-zoom';

type D2DiagramProps = {
  src: string;
  alt: string;
};

export function D2Diagram({ src, alt }: D2DiagramProps) {
  const diagramUrl = `/product-docs${src}`;
  return (
    <figure className="not-prose my-8 max-w-full">
      <div
        aria-label="Scrollable diagram; click the image to zoom"
        className="max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-fd-border"
        role="region"
        tabIndex={0}
      >
        <ImageZoom src={diagramUrl} zoomInProps={{ alt }}>
          <img
            src={diagramUrl}
            alt={alt}
            className="block h-auto w-auto max-w-none"
            style={{ height: 'auto', maxWidth: 'none', width: 'auto' }}
          />
        </ImageZoom>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-2 text-sm text-fd-muted-foreground">
        <span>Scroll horizontally to inspect the full diagram. Click it to zoom.</span>
        <a href={diagramUrl} target="_blank" rel="noreferrer">
          Open SVG full size
        </a>
      </figcaption>
    </figure>
  );
}
