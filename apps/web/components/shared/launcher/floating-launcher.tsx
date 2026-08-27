'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { useTranslations } from 'next-intl';

/**
 * One floating button for the actions available on a page.
 *
 * Extracted from the feedback widget, which owned this drag-and-snap behaviour alone. With
 * content suggestions added there would otherwise be two floating buttons in the corner, and a
 * third whenever another gated action arrives — so the button is now shared and opens a menu when
 * more than one action is available.
 *
 * With exactly one action it behaves as it always did: a single button that performs it, with no
 * menu in the way. Someone who holds one capability should not pay for the existence of others.
 *
 * ⚠️ NOT the content editor. That is a *mode* with its own toolbar (edit / staged / publish /
 * exit), not an action, and folding a toolbar into a menu item would be a redesign of a working
 * feature rather than a consolidation. See openspec/changes/content-suggestions/tasks.md 5.1.
 */

const BUTTON_SIZE = 44;
const MARGIN = 20;
const STORAGE_KEY = 'veervrat.launcher.corner';
const SNAP_SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const;

type Corner = 'tl' | 'tr' | 'bl' | 'br';

export type LauncherAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

function cornerCoords(corner: Corner) {
  const right = window.innerWidth - BUTTON_SIZE - MARGIN;
  // Clears the bottom pill nav on small screens, where it would otherwise sit under the button.
  const bottom = window.innerHeight - BUTTON_SIZE - MARGIN - (window.innerWidth < 768 ? 64 : 0);
  return {
    x: corner === 'tl' || corner === 'bl' ? MARGIN : right,
    y: corner === 'tl' || corner === 'tr' ? MARGIN : bottom,
  };
}

function loadCorner(): Corner {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'tl' || stored === 'tr' || stored === 'bl' || stored === 'br' ? stored : 'br';
  } catch {
    // Private windows and blocked site data throw on access rather than returning null.
    return 'br';
  }
}

export function FloatingLauncher({
  actions,
  icon,
}: {
  actions: LauncherAction[];
  icon: React.ReactNode;
}) {
  const t = useTranslations('launcher');
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const onDragEnd = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const corner = `${cy < window.innerHeight / 2 ? 't' : 'b'}${
      cx < window.innerWidth / 2 ? 'l' : 'r'
    }` as Corner;
    try {
      localStorage.setItem(STORAGE_KEY, corner);
    } catch {
      // Not being able to remember the corner is not a reason to refuse to move.
    }
    snapTo(corner, true);
  };

  if (actions.length === 0) return null;

  const activate = () => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    // One action needs no menu.
    if (actions.length === 1) {
      actions[0].onSelect();
      return;
    }
    setMenuOpen((v) => !v);
  };

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          aria-label={t('closeMenu')}
          className="fixed inset-0 z-[44] cursor-default"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <motion.button
        ref={buttonRef}
        type="button"
        aria-label={actions.length === 1 ? actions[0].label : t('buttonLabel')}
        aria-haspopup={actions.length > 1 ? 'menu' : undefined}
        aria-expanded={actions.length > 1 ? menuOpen : undefined}
        drag
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => {
          draggedRef.current = true;
        }}
        onDragEnd={onDragEnd}
        onClick={activate}
        style={{ x, y, width: BUTTON_SIZE, height: BUTTON_SIZE, touchAction: 'none' }}
        // z-[45] rides above the bottom pill nav (z-40) but below the modal backdrop (z-50).
        className={`fixed left-0 top-0 z-[45] flex cursor-grab items-center justify-center rounded-full bg-accent text-bg shadow-modal transition-opacity active:cursor-grabbing ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {icon}
      </motion.button>

      {menuOpen && (
        <motion.div
          role="menu"
          aria-label={t('buttonLabel')}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ x, y }}
          className="fixed left-0 top-0 z-[46] min-w-[200px] -translate-x-[calc(100%-44px)] -translate-y-[calc(100%+8px)] overflow-hidden rounded-xl border border-border bg-surface shadow-modal"
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                action.onSelect();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[14px] hover:bg-fg/5"
            >
              <span className="text-muted">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </motion.div>
      )}
    </>
  );
}
