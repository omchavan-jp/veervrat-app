// When a click's text matches several message keys, narrow the candidates using DOM/route
// signals that are already present for free (no call-site tagging, keeping the editor
// isolated per its design). This resolves the common case — e.g. text inside an open
// dialog vs. the same text used as a page's inline trigger — to a single key automatically,
// skipping the picker. Genuine remaining ties (real duplicate content) still fall through
// to the multi-select picker.
export function disambiguateKeys(
  keys: string[],
  context: { insideDialog: boolean; routeSegments: string[] },
): string[] {
  if (keys.length <= 1) return keys;

  const filtered = keys.filter((key) => {
    const segments = key.toLowerCase().split('.');
    const keyMentionsDialog = segments.some((s) => s.includes('modal') || s.includes('dialog'));
    if (keyMentionsDialog !== context.insideDialog) return false;
    if (context.routeSegments.length > 0 && !context.routeSegments.includes(segments[0])) {
      return false;
    }
    return true;
  });

  // Never over-filter to zero — that would hide a real match. Fall back to the full set.
  return filtered.length > 0 ? filtered : keys;
}
