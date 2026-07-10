// Shared, pure helpers for the in-context content editor. Used both server-side
// (i18n/request.ts merges overrides) and client-side (reverse-lookup of clicked text).

export type NestedMessages = { [key: string]: string | NestedMessages };

// Flattens a nested next-intl catalog to a dotted map: { "feedback.buttonLabel": "..." }.
export function flattenMessages(obj: NestedMessages, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flattenMessages(v, key));
  }
  return out;
}

// Builds a trimmed-value → keys index for reverse lookup. A value can map to several keys,
// so a click resolves uniquely only when exactly one key matches.
export function buildValueIndex(flat: Record<string, string>): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const [key, value] of Object.entries(flat)) {
    const norm = value.trim();
    if (!norm) continue;
    const existing = index.get(norm);
    if (existing) existing.push(key);
    else index.set(norm, [key]);
  }
  return index;
}

// The keys whose value equals the clicked text (0 = no match, 1 = unique, >1 = ambiguous).
export function findKeysByText(index: Map<string, string[]>, text: string): string[] {
  return index.get(text.trim()) ?? [];
}

// Deep copy of `base` with each dotted override key set to its value. Order-preserving and
// non-mutating, so a cached message module is never polluted.
export function applyOverrides(
  base: NestedMessages,
  overrides: Record<string, string>,
): NestedMessages {
  const result = JSON.parse(JSON.stringify(base)) as NestedMessages;
  for (const [dottedKey, value] of Object.entries(overrides)) {
    const parts = dottedKey.split('.');
    let node: NestedMessages = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next = node[part];
      if (typeof next !== 'object' || next === null) node[part] = {};
      node = node[part] as NestedMessages;
    }
    node[parts[parts.length - 1]] = value;
  }
  return result;
}
