import { AzureBlobStorageProvider } from './azure-blob-storage.provider';

const { blockBlobMock, containerClientMock, serviceMock } = vi.hoisted(() => {
  const blockBlobMock = {
    url: 'https://veervratuatuploads.blob.core.windows.net/uploads/x.jpg',
    uploadData: vi.fn(),
    downloadToBuffer: vi.fn(),
    deleteIfExists: vi.fn(),
  };
  const containerClientMock = { getBlockBlobClient: vi.fn(() => blockBlobMock) };
  const serviceMock = {
    getContainerClient: vi.fn(() => containerClientMock),
    getUserDelegationKey: vi.fn(),
    accountName: 'veervratuatuploads',
  };
  return { blockBlobMock, containerClientMock, serviceMock };
});

vi.mock('@azure/identity', () => ({ DefaultAzureCredential: class {} }));
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: class {
    constructor() {
      return serviceMock;
    }
  },
  generateBlobSASQueryParameters: vi.fn(() => ({ toString: () => 'sv=2024&sig=abc' })),
  BlobSASPermissions: { parse: vi.fn((s: string) => s) },
}));

const config = {
  accountName: 'veervratuatuploads',
  containerName: 'uploads',
  publicContainerName: 'uploads-public',
  managedIdentityClientId: 'abc-123',
};

describe('AzureBlobStorageProvider', () => {
  let provider: AzureBlobStorageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AzureBlobStorageProvider(config);
  });

  it('put() uploads with the given content type and returns the blob URL', async () => {
    const result = await provider.put(
      'uploads/x.jpg',
      Buffer.from('data'),
      'image/jpeg',
      'private',
    );

    expect(containerClientMock.getBlockBlobClient).toHaveBeenCalledWith('uploads/x.jpg');
    expect(blockBlobMock.uploadData).toHaveBeenCalledWith(
      Buffer.from('data'),
      expect.objectContaining({ blobHTTPHeaders: { blobContentType: 'image/jpeg' } }),
    );
    expect(result.url).toBe('https://veervratuatuploads.blob.core.windows.net/uploads/x.jpg');
  });

  it('get() returns whatever the SDK downloads', async () => {
    blockBlobMock.downloadToBuffer.mockResolvedValue(Buffer.from('contents'));
    const result = await provider.get('uploads/x.jpg', 'private');
    expect(result).toEqual(Buffer.from('contents'));
  });

  it('delete() uses deleteIfExists — idempotent on a key that is already gone', async () => {
    // #140's avatar-deletion path must not fail because the file was already removed, or
    // never existed. `deleteIfExists`, not `delete`, is the whole point of this test.
    await provider.delete('uploads/x.jpg', 'private');
    expect(blockBlobMock.deleteIfExists).toHaveBeenCalledWith();
    expect(blockBlobMock.deleteIfExists).not.toHaveBeenCalledWith(expect.anything());
  });

  it('signedUrl() requests a fresh delegation key rather than caching one', async () => {
    serviceMock.getUserDelegationKey.mockResolvedValue({ signedOid: 'x' });
    await provider.signedUrl('uploads/x.jpg', 60);
    await provider.signedUrl('uploads/x.jpg', 60);

    // Every call re-requests the delegation key. A cached key that outlived its own validity
    // window would let a URL keep working past its advertised expiry — the exact failure a
    // short-lived signed URL exists to prevent.
    expect(serviceMock.getUserDelegationKey).toHaveBeenCalledTimes(2);
  });

  it("signedUrl()'s expiry window matches the requested duration", async () => {
    serviceMock.getUserDelegationKey.mockResolvedValue({ signedOid: 'x' });
    const before = Date.now();

    await provider.signedUrl('uploads/x.jpg', 300);

    const [startsOn, expiresOn] = serviceMock.getUserDelegationKey.mock.calls[0] as [Date, Date];
    const windowMs = expiresOn.getTime() - startsOn.getTime();
    expect(windowMs).toBe(300_000);
    expect(startsOn.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('signedUrl() appends the SAS query string to the blob URL', async () => {
    serviceMock.getUserDelegationKey.mockResolvedValue({ signedOid: 'x' });
    const result = await provider.signedUrl('uploads/x.jpg', 60);

    expect(result).toBe(
      'https://veervratuatuploads.blob.core.windows.net/uploads/x.jpg?sv=2024&sig=abc',
    );
  });
});

/**
 * `getOrNull` — the seam that lets a caller ask "is anything stored here?" without knowing which
 * SDK is underneath.
 *
 * These are not incidental cases. Azure signals a missing blob with a shape that shares no field
 * with the S3 equivalent, so a check written for one silently stops recognising the other. That
 * is what made the content editor answer 503 on every deployed environment.
 */
describe('AzureBlobStorageProvider.getOrNull — absence is an answer, not a fault', () => {
  let provider: AzureBlobStorageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AzureBlobStorageProvider(config);
  });

  it('returns the buffer when the blob is there', async () => {
    blockBlobMock.downloadToBuffer.mockResolvedValue(Buffer.from('{"a":1}'));

    await expect(provider.getOrNull('content-overrides/en.json', 'private')).resolves.toEqual(
      Buffer.from('{"a":1}'),
    );
  });

  // The real Azure shape: a RestError carrying `code`, with no `name: 'NoSuchKey'` and no
  // `$metadata` anywhere — which is precisely why the S3-shaped check could not see it.
  it('returns null for a RestError with code BlobNotFound', async () => {
    blockBlobMock.downloadToBuffer.mockRejectedValue(
      Object.assign(new Error('The specified blob does not exist.'), {
        name: 'RestError',
        statusCode: 404,
        code: 'BlobNotFound',
      }),
    );

    await expect(provider.getOrNull('content-overrides/en.json', 'private')).resolves.toBeNull();
  });

  it('returns null for a bare 404 even when no code is supplied', async () => {
    blockBlobMock.downloadToBuffer.mockRejectedValue(
      Object.assign(new Error('Not Found'), { name: 'RestError', statusCode: 404 }),
    );

    await expect(provider.getOrNull('missing', 'private')).resolves.toBeNull();
  });

  // A missing container is a configuration fault, not an empty object. Swallowing it would make
  // a wrongly-named container look exactly like a fresh environment with nothing staged.
  it('still throws when the CONTAINER is missing, rather than reporting it as empty', async () => {
    blockBlobMock.downloadToBuffer.mockRejectedValue(
      Object.assign(new Error('The specified container does not exist.'), {
        name: 'RestError',
        statusCode: 404,
        code: 'ContainerNotFound',
      }),
    );

    await expect(provider.getOrNull('anything', 'private')).rejects.toThrow(/container/i);
  });

  // The control: a genuine failure must not be flattened into "nothing there". Without this,
  // a getOrNull that simply caught everything would pass every test above.
  it('rethrows a real failure instead of reporting it as absent', async () => {
    blockBlobMock.downloadToBuffer.mockRejectedValue(
      Object.assign(new Error('permission denied'), { name: 'RestError', statusCode: 403 }),
    );

    await expect(provider.getOrNull('forbidden', 'private')).rejects.toThrow('permission denied');
  });

  it('does NOT recognise the S3 not-found shape — each provider translates only its own SDK', async () => {
    blockBlobMock.downloadToBuffer.mockRejectedValue(
      Object.assign(new Error('NoSuchKey'), {
        name: 'NoSuchKey',
        $metadata: { httpStatusCode: 404 },
      }),
    );

    // Deliberate: if this ever starts returning null, someone has merged the two checks into one
    // shared helper, and the next SDK change will break silently.
    await expect(provider.getOrNull('s3-shaped', 'private')).rejects.toThrow('NoSuchKey');
  });
});
