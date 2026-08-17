'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { MessageSquarePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FeedbackModal } from './feedback-modal';
import { useRuntimeConfig } from '@/lib/runtime-config-provider';

export type FeedbackMode = 'test' | 'public';

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const STORAGE_KEY = 'veervrat.feedback.corner';
const BUTTON_SIZE = 48;
const EDGE_MARGIN = 16;
// Below `md` a floating pill nav sits at bottom-center (~72px tall from the bottom
// edge). Lift the widget's bottom-corner rest positions above it so it can never
// hide behind the nav; on `md`+ (no bottom nav) the normal edge margin applies.
const BOTTOM_NAV_CLEARANCE = 84;
const SNAP_SPRING = { type: 'spring', stiffness: 400, damping: 30 } as const;

function bottomInset(): number {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
    ? BOTTOM_NAV_CLEARANCE
    : EDGE_MARGIN;
}

function cornerCoords(corner: Corner): { x: number; y: number } {
  const left = corner === 'tl' || corner === 'bl';
  const top = corner === 'tl' || corner === 'tr';
  return {
    x: left ? EDGE_MARGIN : window.innerWidth - BUTTON_SIZE - EDGE_MARGIN,
    y: top ? EDGE_MARGIN : window.innerHeight - BUTTON_SIZE - bottomInset(),
  };
}

function loadCorner(): Corner {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'tl' || stored === 'tr' || stored === 'bl' || stored === 'br'
    ? stored
    : 'br';
}

// Floating beta-feedback entry point. Draggable; snaps to the nearest viewport corner
// on release and persists the corner (not raw coordinates, so it survives viewport
// changes). Rendered only inside the authenticated shell and only when the environment's
// feedback mode is 'test' or 'public' — read at runtime, since one image serves both UAT
// and prod and this must be able to differ between them.
export function FeedbackWidget() {
  const { feedbackMode } = useRuntimeConfig();
  if (feedbackMode === 'off') return null;
  return <FeedbackWidgetInner mode={feedbackMode} />;
}

function FeedbackWidgetInner({ mode }: { mode: FeedbackMode }) {
  const t = useTranslations('feedback');
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Suppresses the click that fires after a drag release.
  const draggedRef = useRef(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const snapTo = useCallback(
    (corner: Corner, spring: boolean) => {
      const target = cornerCoords(corner);
      if (spring) {
        animate(x, target.x, SNAP_SPRING);
        animate(y, target.y, SNAP_SPRING);
      } else {
        x.set(target.x);
        y.set(target.y);
      }
    },
    [x, y],
  );

  useEffect(() => {
    snapTo(loadCorner(), false);
    setMounted(true);
    const onResize = () => snapTo(loadCorner(), false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [snapTo]);

  const onDragEnd = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const corner: Corner = `${cy < window.innerHeight / 2 ? 't' : 'b'}${
      cx < window.innerWidth / 2 ? 'l' : 'r'
    }` as Corner;
    localStorage.setItem(STORAGE_KEY, corner);
    snapTo(corner, true);
  };

  return (
    <>
      <motion.button
        ref={buttonRef}
        type="button"
        aria-label={t('buttonLabel')}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => {
          draggedRef.current = true;
        }}
        onDragEnd={onDragEnd}
        onClick={() => {
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          setOpen(true);
        }}
        style={{ x, y, width: BUTTON_SIZE, height: BUTTON_SIZE, touchAction: 'none' }}
        // z-[45] rides above the bottom pill nav (z-40) but below the modal backdrop (z-50).
        className={`fixed left-0 top-0 z-[45] flex cursor-grab items-center justify-center rounded-full bg-accent text-bg shadow-modal transition-opacity active:cursor-grabbing ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <MessageSquarePlus className="h-5 w-5" aria-hidden />
      </motion.button>

      <FeedbackModal mode={mode} open={open} onOpenChange={setOpen} />
    </>
  );
}
