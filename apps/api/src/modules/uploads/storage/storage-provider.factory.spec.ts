import { ConfigService } from '@nestjs/config';
import { storageProviderFactory } from './storage-provider.factory';
import { S3StorageProvider } from './s3-storage.provider';
import { AzureBlobStorageProvider } from './azure-blob-storage.provider';

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

const resolve = (config: ConfigService) => (storageProviderFactory as any).useFactory(config);

describe('storageProviderFactory', () => {
  it('chooses Azure Blob when all three Azure values are present', () => {
    const provider = resolve(
      makeConfig({
        AZURE_STORAGE_ACCOUNT_NAME: 'veervratuatuploads',
        AZURE_STORAGE_CONTAINER_NAME: 'uploads',
        AZURE_CLIENT_ID: 'abc-123',
      }),
    );
    expect(provider).toBeInstanceOf(AzureBlobStorageProvider);
  });

  it('chooses S3/MinIO when only the S3 values are present', () => {
    const provider = resolve(
      makeConfig({
        S3_ENDPOINT: 'http://localhost:9000',
        S3_ACCESS_KEY: 'veervrat',
        S3_SECRET_KEY: 'veervrat_local',
        S3_BUCKET: 'veervrat-uploads',
      }),
    );
    expect(provider).toBeInstanceOf(S3StorageProvider);
  });

  it('refuses to start when both backends are fully configured', () => {
    // Not a preference order. Which store an upload lands in is not something to guess at:
    // picking wrong writes user files somewhere nobody reads from, and picking wrong QUIETLY
    // means nobody finds out until the files are missing. A container that will not boot is the
    // better failure.
    expect(() =>
      resolve(
        makeConfig({
          AZURE_STORAGE_ACCOUNT_NAME: 'veervratuatuploads',
          AZURE_STORAGE_CONTAINER_NAME: 'uploads',
          AZURE_CLIENT_ID: 'abc-123',
          S3_ENDPOINT: 'http://localhost:9000',
          S3_ACCESS_KEY: 'veervrat',
          S3_SECRET_KEY: 'veervrat_local',
          S3_BUCKET: 'veervrat-uploads',
        }),
      ),
    ).toThrow(/ambiguously configured/);
  });

  it('names both offending settings in the ambiguity error, not just that one exists', () => {
    // The person reading this error is looking at an environment they did not configure. Naming
    // the two variables that collided is the difference between a two-minute fix and a hunt.
    try {
      resolve(
        makeConfig({
          AZURE_STORAGE_ACCOUNT_NAME: 'veervratuatuploads',
          AZURE_STORAGE_CONTAINER_NAME: 'uploads',
          AZURE_CLIENT_ID: 'abc-123',
          S3_ENDPOINT: 'http://localhost:9000',
          S3_ACCESS_KEY: 'veervrat',
          S3_SECRET_KEY: 'veervrat_local',
          S3_BUCKET: 'veervrat-uploads',
        }),
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('AZURE_STORAGE_ACCOUNT_NAME=veervratuatuploads');
      expect(message).toContain('S3_ENDPOINT=http://localhost:9000');
    }
  });

  it('a PARTIAL second config is not ambiguity — the complete one still wins', () => {
    // Only a fully-configured second backend is a real collision. A stray leftover variable
    // (S3_ENDPOINT alone, say, from an old .env) must not brick the container — that would turn
    // this guard into its own outage.
    const provider = resolve(
      makeConfig({
        AZURE_STORAGE_ACCOUNT_NAME: 'veervratuatuploads',
        AZURE_STORAGE_CONTAINER_NAME: 'uploads',
        AZURE_CLIENT_ID: 'abc-123',
        S3_ENDPOINT: 'http://localhost:9000',
      }),
    );
    expect(provider).toBeInstanceOf(AzureBlobStorageProvider);
  });

  it('falls back to an unconfigured provider that refuses every operation, with neither set', () => {
    const provider = resolve(makeConfig({}));
    expect(provider).not.toBeInstanceOf(AzureBlobStorageProvider);
    expect(provider).not.toBeInstanceOf(S3StorageProvider);
  });

  it('does not select Azure on a partial config — every one of the three values is required', async () => {
    const provider = resolve(
      makeConfig({
        AZURE_STORAGE_ACCOUNT_NAME: 'veervratuatuploads',
        // AZURE_STORAGE_CONTAINER_NAME and AZURE_CLIENT_ID missing
      }),
    );
    expect(provider).not.toBeInstanceOf(AzureBlobStorageProvider);
    await expect(provider.put('k', Buffer.from('x'), 'image/jpeg')).rejects.toThrow(
      'not configured',
    );
  });

  it('does not select S3 on a partial config', async () => {
    const provider = resolve(makeConfig({ S3_ENDPOINT: 'http://localhost:9000' }));
    expect(provider).not.toBeInstanceOf(S3StorageProvider);
    await expect(provider.put('k', Buffer.from('x'), 'image/jpeg')).rejects.toThrow(
      'not configured',
    );
  });

  it('the unconfigured fallback refuses every operation on the interface, not just put', async () => {
    const provider = resolve(makeConfig({}));
    await expect(provider.get('k')).rejects.toThrow('not configured');
    await expect(provider.delete('k')).rejects.toThrow('not configured');
    await expect(provider.signedUrl('k', 60)).rejects.toThrow('not configured');
  });
});
