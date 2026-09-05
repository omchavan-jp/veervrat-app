import { S3StorageProvider } from './s3-storage.provider';

// vi.hoisted ensures these exist when the (hoisted) vi.mock factories run.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = sendMock;
  },
  PutObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
  GetObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
}));

const { getSignedUrlMock } = vi.hoisted(() => ({ getSignedUrlMock: vi.fn() }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: getSignedUrlMock }));

const config = {
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  bucket: 'veervrat-uploads',
  publicBucket: 'veervrat-uploads-public',
  accessKeyId: 'veervrat',
  secretAccessKey: 'veervrat_local',
  // Base WITHOUT the bucket — the provider appends whichever bucket it is addressing, so the
  // base can no longer bake the private one in.
  publicBase: 'http://localhost:9000',
};

describe('S3StorageProvider', () => {
  let provider: S3StorageProvider;

  beforeEach(() => {
    sendMock.mockReset();
    getSignedUrlMock.mockReset();
    provider = new S3StorageProvider(config);
  });

  it('put() writes the object and returns a URL under the configured public base', async () => {
    sendMock.mockResolvedValue({});
    const result = await provider.put(
      'uploads/x.jpg',
      Buffer.from('data'),
      'image/jpeg',
      'private',
    );

    expect(result.url).toBe('http://localhost:9000/veervrat-uploads/uploads/x.jpg');
    const input = (sendMock.mock.calls[0][0] as { input: Record<string, unknown> }).input;
    expect(input).toMatchObject({
      Bucket: 'veervrat-uploads',
      Key: 'uploads/x.jpg',
      ContentType: 'image/jpeg',
    });
  });

  it('delete() issues a DeleteObjectCommand for the given key', async () => {
    sendMock.mockResolvedValue({});
    await provider.delete('uploads/x.jpg', 'private');

    const input = (sendMock.mock.calls[0][0] as { input: Record<string, unknown> }).input;
    expect(input).toMatchObject({ Bucket: 'veervrat-uploads', Key: 'uploads/x.jpg' });
  });

  it('get() returns the object body as a Buffer', async () => {
    sendMock.mockResolvedValue({
      Body: { transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3])) },
    });
    const result = await provider.get('uploads/x.jpg', 'private');

    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3]);
  });

  it('get() returns an empty buffer rather than throwing when the SDK gives no body', async () => {
    sendMock.mockResolvedValue({ Body: undefined });
    const result = await provider.get('uploads/x.jpg', 'private');

    expect(result).toEqual(Buffer.alloc(0));
  });

  it('signedUrl() delegates to the presigner with the requested expiry', async () => {
    getSignedUrlMock.mockResolvedValue('http://localhost:9000/signed?x=1');
    const result = await provider.signedUrl('uploads/x.jpg', 300);

    expect(result).toBe('http://localhost:9000/signed?x=1');
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: { Bucket: 'veervrat-uploads', Key: 'uploads/x.jpg' } }),
      { expiresIn: 300 },
    );
  });
});

/**
 * `getOrNull` — the S3 half of the seam. Its Azure counterpart is tested the same way against a
 * completely different error shape; the two must agree on the answer while sharing no code.
 */
describe('S3StorageProvider.getOrNull — absence is an answer, not a fault', () => {
  let provider: S3StorageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new S3StorageProvider(config);
  });

  it('returns the buffer when the object is there', async () => {
    sendMock.mockResolvedValue({
      Body: { transformToByteArray: () => Promise.resolve(new Uint8Array([123, 125])) },
    });

    await expect(provider.getOrNull('content-overrides/en.json', 'private')).resolves.toEqual(
      Buffer.from('{}'),
    );
  });

  it('returns null for a typed NoSuchKey error', async () => {
    sendMock.mockRejectedValue(Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' }));

    await expect(provider.getOrNull('content-overrides/en.json', 'private')).resolves.toBeNull();
  });

  // MinIO — what local development actually talks to — does not always set the typed `name`,
  // so the status form has to be recognised too or the local experience diverges from deployed.
  it('returns null for a 404 reported only via $metadata, as MinIO does', async () => {
    sendMock.mockRejectedValue(
      Object.assign(new Error('Not Found'), { $metadata: { httpStatusCode: 404 } }),
    );

    await expect(provider.getOrNull('missing', 'private')).resolves.toBeNull();
  });

  // The control: a real failure must stay a failure.
  it('rethrows a real failure instead of reporting it as absent', async () => {
    sendMock.mockRejectedValue(
      Object.assign(new Error('AccessDenied'), {
        name: 'AccessDenied',
        $metadata: { httpStatusCode: 403 },
      }),
    );

    await expect(provider.getOrNull('forbidden', 'private')).rejects.toThrow('AccessDenied');
  });

  it('does NOT recognise the Azure not-found shape — each provider translates only its own SDK', async () => {
    sendMock.mockRejectedValue(
      Object.assign(new Error('BlobNotFound'), {
        name: 'RestError',
        statusCode: 404,
        code: 'BlobNotFound',
      }),
    );

    await expect(provider.getOrNull('azure-shaped', 'private')).rejects.toThrow('BlobNotFound');
  });
});
