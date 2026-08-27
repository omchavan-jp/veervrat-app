'use client';

import { useCallback, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { contentSuggestionsApi } from '@/lib/api/content-suggestions';
import { captureAnchor } from '@/lib/suggestions/anchor';
import { resolveEntity } from '@/lib/suggestions/entity-registry';
import { SuggestionPicker } from './suggestion-picker';
import { SuggestionPanel, type PanelContext } from './suggestion-panel';
import { SuggestionPins } from './suggestion-pins';

/**
 * Turns the route Next has resolved back into the pattern that names it.
 *
 * `usePathname()` gives `/weaknesses/abc-123`; the suggestion has to record `/weaknesses/[id]`,
 * because that is what identifies the *kind* of page, and the id travels separately as the
 * entity. Next does not expose the pattern directly, so it is reconstructed by replacing each
 * param value with its name.
 *
 * Values are replaced longest-first: a short param value that happens to be a substring of a
 * longer one would otherwise corrupt the pattern.
 */
export function routePattern(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
): string {
  const entries = Object.entries(params)
    .flatMap(([name, value]) =>
      (Array.isArray(value) ? value : [value])
        .filter(Boolean)
        .map((v) => [name, v as string] as const),
    )
    .sort((a, b) => b[1].length - a[1].length);

  let pattern = pathname;
  for (const [name, value] of entries) {
    pattern = pattern.split(`/${value}`).join(`/[${name}]`);
  }
  return pattern;
}

export function SuggestionMode({ active, onExit }: { active: boolean; onExit: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const queryClient = useQueryClient();
  const [context, setContext] = useState<PanelContext | null>(null);

  const route = routePattern(pathname ?? '/', params ?? {});
  const entity = resolveEntity(route, params ?? {});

  // The author's own suggestions on this page, for the pins. Enabled whenever the feature is
  // reachable, not only in picking mode — the point of a pin is that you see your past thinking
  // as you browse.
  const { data: mine } = useQuery({
    queryKey: ['content-suggestions', 'mine', route, entity.entityId ?? null],
    queryFn: () => contentSuggestionsApi.mine({ route, entityId: entity.entityId ?? null }),
    staleTime: 30_000,
  });

  const onPick = useCallback(
    (el: Element) => {
      setContext({
        anchor: captureAnchor(el),
        route,
        url: window.location.href,
        entityType: entity.entityType,
        entityId: entity.entityId,
      });
      onExit(); // leave picking mode; the panel takes over
    },
    [route, entity.entityType, entity.entityId, onExit],
  );

  return (
    <>
      {mine && mine.length > 0 && <SuggestionPins suggestions={mine} />}
      {active && !context && <SuggestionPicker onPick={onPick} onCancel={onExit} />}
      {context && (
        <SuggestionPanel
          context={context}
          onClose={() => setContext(null)}
          onCreated={() =>
            void queryClient.invalidateQueries({ queryKey: ['content-suggestions', 'mine'] })
          }
        />
      )}
    </>
  );
}
