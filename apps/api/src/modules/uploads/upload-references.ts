/**
 * Finds the upload keys referenced by a piece of stored rich-text content.
 *
 * Images are uploaded while composing, before the document exists, so an upload cannot be linked
 * to its parent at upload time. The link is made when the document is saved, by reading back the
 * content the user actually kept — which is the only reliable statement of what the document
 * contains. An image inserted and then deleted before saving is correctly not linked.
 *
 * Deliberately tolerant of shape. The body is a Tiptap JSON AST, and this walks anything
 * object-or-array-shaped looking for `src` rather than encoding a schema. A future node type
 * carrying an image — a gallery, a cover, an attachment — is then found without this needing to
 * know about it, and the failure mode of the alternative (silently missing an image, so it stays
 * an orphan readable only by its uploader) is invisible until someone reports a broken picture.
 */

// Matches the URL shape `uploads.service.ts` returns: <origin>/api/v1/uploads/<key>, where the
// origin may be absent locally. Anchored at the route so an unrelated URL that merely contains
// the word "uploads" cannot produce a bogus key.
const UPLOAD_SRC = /\/api\/v1\/uploads\/([A-Za-z0-9._-]+)$/;

export function extractUploadKeys(body: unknown): string[] {
  const keys = new Set<string>();

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== 'object') return;

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === 'src' && typeof value === 'string') {
        const match = UPLOAD_SRC.exec(value);
        if (match) keys.add(match[1]);
        continue;
      }
      walk(value);
    }
  };

  walk(body);
  return [...keys];
}
