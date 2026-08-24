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
  managedIdentityClientId: 'abc-123',
};

describe('AzureBlobStorageProvider', () => {
  let provider: AzureBlobStorageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new AzureBlobStorageProvider(config);
  });

  it('put() uploads with the given content type and returns the blob URL', async () => {
    const result = await provider.put('uploads/x.jpg', Buffer.from('data'), 'image/jpeg');

    expect(containerClientMock.getBlockBlobClient).toHaveBeenCalledWith('uploads/x.jpg');
    expect(blockBlobMock.uploadData).toHaveBeenCalledWith(
      Buffer.from('data'),
      expect.objectContaining({ blobHTTPHeaders: { blobContentType: 'image/jpeg' } }),
    );
    expect(result.url).toBe('https://veervratuatuploads.blob.core.windows.net/uploads/x.jpg');
  });

  it('get() returns whatever the SDK downloads', async () => {
    blockBlobMock.downloadToBuffer.mockResolvedValue(Buffer.from('contents'));
    const result = await provider.get('uploads/x.jpg');
    expect(result).toEqual(Buffer.from('contents'));
  });

  it('delete() uses deleteIfExists — idempotent on a key that is already gone', async () => {
    // #140's avatar-deletion path must not fail because the file was already removed, or
    // never existed. `deleteIfExists`, not `delete`, is the whole point of this test.
    await provider.delete('uploads/x.jpg');
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
