// Single source of truth for the content-editor allowlist (CONTENT_EDITOR_USER_IDS).
// Used both by the content-overrides module (write/publish/read authorization) and by
// /auth/me (so the web shows the in-context editor UI only to allowlisted users).
export function parseContentEditorIds(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}
