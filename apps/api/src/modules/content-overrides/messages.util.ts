// next-intl message catalogs are nested objects whose leaves are strings.
export type NestedMessages = { [key: string]: string | NestedMessages };

// Flattens a nested catalog to a dotted map: { "feedback.buttonLabel": "..." }.
export function flatten(obj: NestedMessages, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

// Returns a deep copy of `base` with each dotted override key set to its value. Existing
// keys keep their original position (so a published diff touches only changed values);
// intermediate objects are created for any genuinely new key. `base` is not mutated.
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
      if (typeof next !== 'object' || next === null) {
        node[part] = {};
      }
      node = node[part] as NestedMessages;
    }
    node[parts[parts.length - 1]] = value;
  }
  return result;
}
