/**
 * The seam between upload handling and whichever object-storage SDK is behind it.
 *
 * `uploads.service.ts` used to construct an `S3Client` and call it inline, so the Azure Blob
 * move (O15) meant editing the service itself, and any future move would mean editing it again.
 * Everything below the interface line is now a swappable implementation; the service depends
 * only on this shape (#139).
 *
 * ## Why this grew from four operations to five
 *
 * #139 sized the interface at four, and said `get` and `signedUrl` were "the shape #139 asked
 * for, sized so the next feature that needs one is a caller, not a redesign". That prediction
 * half held: `signedUrl` did become a caller rather than a redesign.
 *
 * What it did not anticipate is that upload visibility varies *per upload* (#178). Blog images
 * are published content and want a stable, cacheable URL; chat and experience images must not be
 * readable without authorisation. Since a storage container carries one anonymous-access setting
 * for everything inside it, that split has to reach the interface — hence `visibility` on the
 * operations that address an object, and `publicUrl` alongside `signedUrl`.
 *
 * The alternative was two provider instances, one per container. That doubles the wiring, and
 * makes "which instance am I holding?" a question at every call site — exactly the kind of
 * ambient state that the ambiguity guard in `storage-provider.factory.ts` exists to refuse.
 */

/**
 * Which container an object lives in. Not a hint: `private` objects are stored somewhere that
 * refuses anonymous reads outright, so a bug in the application cannot make one public.
 */
export type StorageVisibility = 'public' | 'private';

export interface StorageProvider {
  /** Writes `body` under `key` in the container matching `visibility`. */
  put(
    key: string,
    body: Buffer,
    contentType: string,
    visibility: StorageVisibility,
  ): Promise<{ url: string }>;

  /** Reads back everything stored under `key`. */
  get(key: string, visibility: StorageVisibility): Promise<Buffer>;

  /** Removes whatever is stored under `key`. Safe to call on a key that does not exist. */
  delete(key: string, visibility: StorageVisibility): Promise<void>;

  /**
   * A time-limited URL for a PRIVATE object, valid for `expiresInSeconds`.
   *
   * Still a bearer credential for its lifetime — short-lived, not revocable. If that is ever
   * insufficient, the resolver streams bytes instead of redirecting, and this stops being called.
   */
  signedUrl(key: string, expiresInSeconds: number): Promise<string>;

  /**
   * The stable, unsigned URL of a PUBLIC object. Synchronous by design: it is string
   * construction, not a request, and nothing about it can fail at runtime.
   */
  publicUrl(key: string): string;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
