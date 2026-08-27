## Why

#217 — data export has no way to reach it. #135 was closed with a backend endpoint
(`GET /users/me/data-export`) that no user can call: no UI, no link, no button. The endpoint
also predates four entities added since (ContentSuggestion, UserFollow, Invitation,
FeedbackItem), so even a direct API call returns an incomplete export.

## What

Two delivery paths, both reachable from `/settings`:

1. **Immediate download** — session-authenticated, returns JSON as a file
2. **Emailed 24-hour link** — HMAC-signed token (no DB table, no cleanup), sends a bilingual
   email with a download link. The token endpoint is public (no session) so it works from any
   device where the email is read.

The export service is expanded to include all 13 entity categories.

## Decision

Approved by Om on 2026-08-27 (audit item 2).
