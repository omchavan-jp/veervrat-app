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
  accessKeyId: 'veervrat',
  secretAccessKey: 'veervrat_local',
  publicBase: 'http://localhost:9000/veervrat-uploads',
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
    const result = await provider.put('uploads/x.jpg', Buffer.from('data'), 'image/jpeg');

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
    await provider.delete('uploads/x.jpg');

    const input = (sendMock.mock.calls[0][0] as { input: Record<string, unknown> }).input;
    expect(input).toMatchObject({ Bucket: 'veervrat-uploads', Key: 'uploads/x.jpg' });
  });

  it('get() returns the object body as a Buffer', async () => {
    sendMock.mockResolvedValue({
      Body: { transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3])) },
    });
    const result = await provider.get('uploads/x.jpg');

    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3]);
  });

  it('get() returns an empty buffer rather than throwing when the SDK gives no body', async () => {
    sendMock.mockResolvedValue({ Body: undefined });
    const result = await provider.get('uploads/x.jpg');

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
