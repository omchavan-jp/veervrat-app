import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ContentOverridesRepository } from './content-overrides.repository';
import { STORAGE_PROVIDER, type StorageProvider } from '../uploads/storage/storage-provider';

/**
 * The repository had no tests, which is a large part of how it stayed broken on every deployed
 * environment without anyone noticing: it built its own S3 client, deployed environments set no
 * S3 configuration by design, and so every call answered 503 while storage was working perfectly
 * for uploads.
 *
 * These pin the behaviour that made it broken and the behaviour that fixes it — above all, that
 * "nothing staged yet" is an empty map rather than an error, and that a genuine storage failure
 * is still a failure.
 */
type MockedStorageProvider = { [K in keyof StorageProvider]: ReturnType<typeof vi.fn> };

describe('ContentOverridesRepository', () => {
  let repo: ContentOverridesRepository;

  const storage: MockedStorageProvider = {
    put: vi.fn(),
    get: vi.fn(),
    getOrNull: vi.fn(),
    delete: vi.fn(),
    signedUrl: vi.fn(),
    publicUrl: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentOverridesRepository, { provide: STORAGE_PROVIDER, useValue: storage }],
    }).compile();
    repo = module.get(ContentOverridesRepository);
  });

  describe('readLocale', () => {
    // The case the old code got wrong on Azure. No database row records whether a locale has been
    // edited, so an absent blob is the ordinary "nobody has edited anything" state — the content
    // editor's first ever load. It must read as empty, not as a fault.
    it('returns an empty map when nothing is staged yet', async () => {
      storage.getOrNull.mockResolvedValue(null);

      await expect(repo.readLocale('en')).resolves.toEqual({});
    });

    it('treats a zero-length object as nothing staged, rather than failing to parse it', async () => {
      storage.getOrNull.mockResolvedValue(Buffer.alloc(0));

      await expect(repo.readLocale('en')).resolves.toEqual({});
    });

    it('reads staged entries back', async () => {
      storage.getOrNull.mockResolvedValue(
        Buffer.from(
          JSON.stringify({
            'auth.login.title': {
              value: 'Sign in',
              editedById: 'u-1',
              editedByName: 'Om',
              editedAt: '2026-09-05T10:00:00.000Z',
            },
          }),
        ),
      );

      const map = await repo.readLocale('en');

      expect(map['auth.login.title']).toEqual({
        value: 'Sign in',
        editedById: 'u-1',
        editedByName: 'Om',
        editedAt: '2026-09-05T10:00:00.000Z',
      });
    });

    // Entries staged before attribution existed are bare strings. They still have to open.
    it('normalises the pre-attribution format, where a value was a plain string', async () => {
      storage.getOrNull.mockResolvedValue(Buffer.from(JSON.stringify({ 'common.save': 'Save' })));

      const map = await repo.readLocale('en');

      expect(map['common.save']).toEqual({
        value: 'Save',
        editedById: '',
        editedByName: 'unknown',
        editedAt: '',
      });
    });

    it('asks for the locale-specific key, under the removable prefix, privately', async () => {
      storage.getOrNull.mockResolvedValue(null);

      await repo.readLocale('mr');

      expect(storage.getOrNull).toHaveBeenCalledWith('content-overrides/mr.json', 'private');
    });

    // The control for the empty cases above: a real failure must not be flattened into "empty".
    // Without this, a readLocale that returned {} on any error would pass every test before it.
    it('reports a genuine storage failure rather than pretending nothing is staged', async () => {
      storage.getOrNull.mockRejectedValue(new Error('connection reset'));

      await expect(repo.readLocale('en')).rejects.toThrow(ServiceUnavailableException);
    });

    it('reports malformed stored JSON rather than silently discarding it', async () => {
      storage.getOrNull.mockResolvedValue(Buffer.from('{ not json'));

      await expect(repo.readLocale('en')).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('readAll', () => {
    it('returns a map per locale, empty ones included', async () => {
      storage.getOrNull.mockResolvedValue(null);

      const all = await repo.readAll();

      expect(Object.keys(all).sort()).toEqual(['en', 'mr']);
      expect(all.en).toEqual({});
      expect(all.mr).toEqual({});
    });
  });

  describe('writeLocale', () => {
    it('writes JSON privately — staged edits are drafts, never anonymously readable', async () => {
      storage.put.mockResolvedValue({ url: 'x' });

      await repo.writeLocale('en', {
        'b.key': { value: 'B', editedById: 'u', editedByName: 'N', editedAt: 't' },
      });

      const [key, body, contentType, visibility] = storage.put.mock.calls[0];
      expect(key).toBe('content-overrides/en.json');
      expect(contentType).toBe('application/json');
      expect(visibility).toBe('private');
      expect(Buffer.isBuffer(body)).toBe(true);
    });

    // Sorted keys keep the staging blob's diffs readable. Insertion order would make every write
    // look like a wholesale rewrite.
    it('sorts keys so the stored blob diffs stably', async () => {
      storage.put.mockResolvedValue({ url: 'x' });
      const entry = (value: string) => ({
        value,
        editedById: 'u',
        editedByName: 'N',
        editedAt: 't',
      });

      await repo.writeLocale('en', {
        'z.last': entry('Z'),
        'a.first': entry('A'),
        'm.middle': entry('M'),
      });

      const written = JSON.parse(String(storage.put.mock.calls[0][1])) as Record<string, unknown>;
      expect(Object.keys(written)).toEqual(['a.first', 'm.middle', 'z.last']);
    });

    it('round-trips: what writeLocale stores, readLocale reads back', async () => {
      storage.put.mockResolvedValue({ url: 'x' });
      const map = {
        'auth.login.title': {
          value: 'Sign in',
          editedById: 'u-1',
          editedByName: 'Om',
          editedAt: '2026-09-05T10:00:00.000Z',
        },
      };

      await repo.writeLocale('en', map);
      storage.getOrNull.mockResolvedValue(storage.put.mock.calls[0][1] as Buffer);

      await expect(repo.readLocale('en')).resolves.toEqual(map);
    });

    it('reports a failed write rather than reporting success', async () => {
      storage.put.mockRejectedValue(new Error('quota exceeded'));

      await expect(repo.writeLocale('en', {})).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
