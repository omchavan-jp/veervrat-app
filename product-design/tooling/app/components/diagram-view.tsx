'use client';

import { type CSSProperties, useId, useRef, useState } from 'react';

type DiagramProps = {
  title: string;
  description?: string;
  light: string;
  dark: string;
  width: string;
  height: string;
};

/** Assets and dimensions come from the canonical D2 build manifest. */
export function DiagramView({ title, description, light, dark, width, height }: DiagramProps) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [failed, setFailed] = useState(false);
  const images = (modal = false) => (
    <>
      {/* Plain SVG images remain vector in browser printing and work before hydration. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="diagram-light"
        src={light}
        width={width}
        height={height}
        alt={title}
        decoding="async"
        onError={() => setFailed(true)}
        data-print-diagram={!modal || undefined}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="diagram-dark"
        src={dark}
        width={width}
        height={height}
        alt={title}
        decoding="async"
        onError={() => setFailed(true)}
      />
    </>
  );
  function open() {
    setZoom(1);
    setExpanded(true);
    dialog.current?.showModal();
    if (viewport.current) viewport.current.scrollTo(0, 0);
  }
  function close() {
    dialog.current?.close();
  }
  async function download(format: 'png' | 'svg') {
    setExporting(true);
    setError('');
    try {
      const { downloadDiagram } = await import('./diagram-export');
      await downloadDiagram({
        url: document.documentElement.classList.contains('dark') ? dark : light,
        title,
        width: Number(width),
        height: Number(height),
        format,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not download the diagram.');
    } finally {
      setExporting(false);
    }
  }
  return (
    <figure
      className="diagram not-prose"
      aria-labelledby={`${id}-title`}
      data-wide={(Number(width) > 1350 && Number(width) / Number(height) > 1.1) || undefined}
    >
      <figcaption className="diagram-heading">
        <div>
          <strong id={`${id}-title`}>{title}</strong>
          {description && <p>{description}</p>}
        </div>
        <div className="diagram-tools">
          <button type="button" ref={trigger} onClick={open} aria-haspopup="dialog">
            Expand
          </button>
          <button type="button" disabled={exporting || failed} onClick={() => download('png')}>
            {exporting ? 'Exporting…' : 'Download PNG'}
          </button>
          <button type="button" disabled={exporting || failed} onClick={() => download('svg')}>
            SVG
          </button>
        </div>
      </figcaption>
      <div
        className="diagram-canvas"
        style={
          {
            '--diagram-natural-width': `${width}px`,
          } as CSSProperties
        }
      >
        {images()}
      </div>
      {failed && (
        <p role="alert" data-render-error>
          Diagram image could not load. Reload the page before exporting.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <dialog
        className="diagram-dialog"
        ref={dialog}
        aria-labelledby={`${id}-modal-title`}
        onClose={() => {
          setExpanded(false);
          trigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === dialog.current) close();
        }}
      >
        <div className="diagram-dialog-header">
          <div>
            <strong id={`${id}-modal-title`}>{title}</strong>
            <p>Zoom to inspect · drag or scroll to pan</p>
          </div>
          <div className="diagram-tools">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => setZoom((v) => Math.max(0.5, v - 0.25))}
            >
              −
            </button>
            <output aria-live="polite">{Math.round(zoom * 100)}%</output>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => setZoom((v) => Math.min(4, v + 0.25))}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                viewport.current?.scrollTo(0, 0);
              }}
            >
              Fit
            </button>
            <button type="button" autoFocus onClick={close}>
              Close
            </button>
          </div>
        </div>
        <div
          className="diagram-viewport"
          ref={viewport}
          tabIndex={0}
          role="region"
          aria-label="Scrollable diagram. Use arrow keys to pan."
          onPointerDown={(event) => {
            if (event.pointerType !== 'mouse' || event.button !== 0) return;
            const el = event.currentTarget;
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              left: el.scrollLeft,
              top: el.scrollTop,
            };
            el.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const d = drag.current;
            event.currentTarget.scrollTo(d.left + d.x - event.clientX, d.top + d.y - event.clientY);
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          {expanded && (
            <div className="diagram-zoom" style={{ width: `${zoom * 100}%` }}>
              {images(true)}
            </div>
          )}
        </div>
      </dialog>
    </figure>
  );
}
