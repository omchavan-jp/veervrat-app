// Extracts the set of ICU argument names referenced in a message — simple placeholders
// like `{name}` and the leading argument of number/plural/select forms
// (`{count, plural, ...}`). This is a pragmatic safety net, not a full ICU parser: its job
// is to block edits that drop or add an interpolation argument (e.g. "Hello {name}" →
// "Hello there"), which would silently break rendering. Mirrored on the web side.
export function extractPlaceholders(message: string): string[] {
  const names = new Set<string>();
  const re = /\{\s*([a-zA-Z0-9_]+)\s*(?:,|\})/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(message)) !== null) {
    names.add(match[1]);
  }
  return [...names].sort();
}

// True when both messages reference exactly the same set of ICU arguments.
export function placeholdersEqual(a: string, b: string): boolean {
  const pa = extractPlaceholders(a);
  const pb = extractPlaceholders(b);
  return pa.length === pb.length && pa.every((name, i) => name === pb[i]);
}
