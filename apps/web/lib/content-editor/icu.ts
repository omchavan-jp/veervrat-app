// Mirror of the API's icu-placeholders check (kept in sync deliberately — the server is the
// authority; this gives the editor instant feedback). Extracts the set of ICU argument
// names referenced in a message so an edit that drops/adds an interpolation argument can be
// blocked before it is saved.
export function extractPlaceholders(message: string): string[] {
  const names = new Set<string>();
  const re = /\{\s*([a-zA-Z0-9_]+)\s*(?:,|\})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(message)) !== null) {
    names.add(match[1]);
  }
  return [...names].sort();
}

export function placeholdersEqual(a: string, b: string): boolean {
  const pa = extractPlaceholders(a);
  const pb = extractPlaceholders(b);
  return pa.length === pb.length && pa.every((name, i) => name === pb[i]);
}
