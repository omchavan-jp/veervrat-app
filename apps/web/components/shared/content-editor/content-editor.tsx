'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useDragControls, useMotionValue } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useMessages, useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Check, GripVertical, History, Pencil, UploadCloud } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { contentOverridesApi } from '@/lib/api/content-overrides';
import {
  buildValueIndex,
  findKeysByText,
  flattenMessages,
  type NestedMessages,
} from '@/lib/content-editor/messages';
import { disambiguateKeys } from '@/lib/content-editor/disambiguate';
import { ContentEditPanel } from './content-edit-panel';
import { ContentStagedList } from './content-staged-list';

const ENABLED = process.env.NEXT_PUBLIC_CONTENT_EDIT === 'on';

type Edge = 'top' | 'bottom';
const STORAGE_KEY = 'veervrat.contentEditor.pos';
const EDGE_MARGIN = 16;
// Below `md` a floating pill nav sits at the bottom; lift the toolbar above it there.
const BOTTOM_NAV_CLEARANCE = 84;
const SNAP_SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;

// Dev-only in-context content editor. Rendered (and dynamically imported) only when
// NEXT_PUBLIC_CONTENT_EDIT is 'on', so it is excluded from the production bundle.
export function ContentEditor() {
  if (!ENABLED) return null;
  return <ContentEditorInner />;
}

function ContentEditorInner() {
  const t = useTranslations('contentEditor');
  const toast = useToast();
  const pathname = usePathname();
  const messages = useMessages() as unknown as NestedMessages;
  const index = useMemo(() => buildValueIndex(flattenMessages(messages)), [messages]);

  const [editMode, setEditMode] = useState(false);
  const [selection, setSelection] = useState<{ keys: string[] } | null>(null);
  const [stagedOpen, setStagedOpen] = useState(false);

  // ── Draggable toolbar ──────────────────────────────────────────────────────
  // Drag by the grip; on release snap to the nearer of the top/bottom edge and keep the
  // horizontal spot (a wide bar suits those edges). The position persists so it stays
  // wherever you parked it, clear of the text you're editing.
  const pillRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const dragControls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const place = useCallback(
    (edge: Edge, px: number, spring: boolean) => {
      const rect = pillRef.current?.getBoundingClientRect();
      const w = rect?.width ?? 220;
      const h = rect?.height ?? 40;
      const bottomInset = window.matchMedia('(max-width: 767px)').matches
        ? BOTTOM_NAV_CLEARANCE
        : EDGE_MARGIN;
      const clampedX = Math.min(Math.max(px, EDGE_MARGIN), window.innerWidth - w - EDGE_MARGIN);
      const targetY = edge === 'top' ? EDGE_MARGIN : window.innerHeight - h - bottomInset;
      if (spring) {
        animate(x, clampedX, SNAP_SPRING);
        animate(y, targetY, SNAP_SPRING);
      } else {
        x.set(clampedX);
        y.set(targetY);
      }
    },
    [x, y],
  );

  useEffect(() => {
    const pos = loadPos();
    place(pos?.edge ?? 'bottom', pos?.x ?? EDGE_MARGIN, false);
    setMounted(true);
    const onResize = () => {
      const p = loadPos();
      place(p?.edge ?? 'bottom', p?.x ?? EDGE_MARGIN, false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [place]);

  const onDragEnd = () => {
    const rect = pillRef.current?.getBoundingClientRect();
    if (!rect) return;
    const edge: Edge = rect.top + rect.height / 2 < window.innerHeight / 2 ? 'top' : 'bottom';
    savePos({ edge, x: rect.left });
    place(edge, rect.left, true);
  };

  // ── ⌥/Alt-click any text → reverse-lookup its key(s) → open the panel. Capture phase +
  // preventDefault so the click never also triggers the underlying control.
  const onDocClick = useCallback(
    (e: MouseEvent) => {
      if (!e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement | null;
      const text = target?.textContent ?? '';
      if (!text.trim()) return;
      const matches = findKeysByText(index, text);
      if (matches.length === 0) {
        toast.add({ title: t('noKey'), type: 'error' });
        return;
      }
      // Narrow multi-key matches using free DOM/route context (e.g. inside an open dialog
      // vs. a page's inline trigger) before falling back to the multi-select picker.
      const keys = disambiguateKeys(matches, {
        insideDialog: target?.closest('[role="dialog"]') !== null,
        routeSegments: pathname.split('/').filter(Boolean),
      });
      setSelection({ keys });
    },
    [index, pathname, t, toast],
  );

  useEffect(() => {
    if (!editMode) return;
    document.addEventListener('click', onDocClick, true);
    document.body.style.cursor = 'crosshair';
    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.body.style.cursor = '';
    };
  }, [editMode, onDocClick]);

  // This component mounts only for allowlisted editors (gated in the layout), so the marker
  // tells the server-side i18n merge to overlay staged edits for this session only — regular
  // users never set it, so they pay no latency and only ever see published copy.
  useEffect(() => {
    document.cookie = `ve_ce=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  }, []);

  const publish = useMutation({
    mutationFn: () => contentOverridesApi.publish(),
    onSuccess: ({ prUrl }) => {
      toast.add({ title: t('publishedTitle'), description: prUrl, type: 'success' });
    },
    onError: () => toast.add({ title: t('publishError'), type: 'error' }),
  });

  return (
    <>
      <motion.div
        ref={pillRef}
        drag
        dragListener={false}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0.06}
        onDragEnd={onDragEnd}
        style={{ x, y, touchAction: 'none' }}
        className={cn(
          'fixed left-0 top-0 z-[45] flex items-center gap-1 rounded-full border border-border bg-surface/95 px-1.5 py-1 shadow-modal backdrop-blur transition-opacity',
          mounted ? 'opacity-100' : 'opacity-0',
        )}
      >
        <button
          type="button"
          aria-label={t('drag')}
          onPointerDown={(e) => dragControls.start(e)}
          className="flex cursor-grab touch-none items-center px-0.5 text-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          aria-pressed={editMode}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] transition-colors',
            editMode ? 'bg-accent text-bg' : 'text-muted hover:text-fg',
          )}
        >
          {editMode ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Pencil className="h-4 w-4" aria-hidden />
          )}
          {editMode ? t('editingOn') : t('editContent')}
        </button>
        <button
          type="button"
          onClick={() => setStagedOpen(true)}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-fg"
        >
          <History className="h-4 w-4" aria-hidden />
          {t('staged')}
        </button>
        <button
          type="button"
          onClick={() => publish.mutate()}
          disabled={publish.isPending}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-fg disabled:opacity-50"
        >
          <UploadCloud className="h-4 w-4" aria-hidden />
          {publish.isPending ? t('publishing') : t('publish')}
        </button>
      </motion.div>

      <ContentEditPanel selection={selection} onClose={() => setSelection(null)} />
      <ContentStagedList open={stagedOpen} onOpenChange={setStagedOpen} />
    </>
  );
}

function loadPos(): { edge: Edge; x: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { edge?: unknown; x?: unknown };
    if ((p.edge === 'top' || p.edge === 'bottom') && typeof p.x === 'number') {
      return { edge: p.edge, x: p.x };
    }
    return null;
  } catch {
    return null;
  }
}

function savePos(pos: { edge: Edge; x: number }): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}
