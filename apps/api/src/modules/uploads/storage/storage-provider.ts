/**
 * The seam between upload handling and whichever object-storage SDK is behind it.
 *
 * `uploads.service.ts` used to construct an `S3Client` and call it inline, so the Azure Blob
 * move (O15) meant editing the service itself, and any future move would mean editing it again.
 * Everything below the interface line is now a swappable implementation; the service depends
 * only on this shape (#139).
 *
 * Kept to exactly the four operations named in that issue. `get` and `signedUrl` have no caller
 * yet — nothing here downloads or privately shares an upload today — but they are not
 * speculative: they are the shape #139 asked for, sized so the next feature that needs one
 * (avatar deletion on #140, or a private-visibility upload) is a caller, not a redesign.
 */
export interface StorageProvider {
  /** Writes `body` under `key` and returns the URL it is reachable at. */
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;

  /** Reads back everything stored under `key`. */
  get(key: string): Promise<Buffer>;

  /** Removes whatever is stored under `key`. Safe to call on a key that does not exist. */
  delete(key: string): Promise<void>;

  /** A time-limited URL for `key`, valid for `expiresInSeconds`. */
  signedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');
