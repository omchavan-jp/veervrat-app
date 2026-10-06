import manifest from '../../.cache/diagrams.json';
import { DiagramView } from './diagram-view';

type D2DiagramProps = {
  src: string;
  alt: string;
};

export function D2Diagram({ src, alt }: D2DiagramProps) {
  const asset = (
    manifest as Record<string, { light: string; dark: string; width: number; height: number }>
  )[src];
  if (!asset) throw new Error(`Unknown canonical D2 diagram: ${src}`);
  return (
    <DiagramView title={alt} {...asset} width={String(asset.width)} height={String(asset.height)} />
  );
}
