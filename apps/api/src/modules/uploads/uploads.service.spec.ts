import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import type { UploadPurpose } from './uploads.service';
import { UploadsService } from './uploads.service';
import { UploadsRepository } from './uploads.repository';
import { STORAGE_PROVIDER, type StorageProvider } from './storage/storage-provider';
import type { SessionUser } from '../auth/types/auth.types';
import { Role } from '@prisma/client';

// The service depends on StorageProvider, not any SDK — that is the entire point of #139. A mock
// of the interface exercises the same contract Azure Blob and S3 both implement, so this test
// stays correct regardless of which one is actually configured.
const { heicConvertMock } = vi.hoisted(() => ({ heicConvertMock: vi.fn() }));
vi.mock('heic-convert', () => ({ default: heicConvertMock }));

// Typed as the mock shape directly, not as `StorageProvider` with per-call-site casts: a bare
// `mockStorage.put` reference (as an assertion target) trips
// `@typescript-eslint/unbound-method` when the property's declared type is the interface's plain
// method signature rather than a `Mock`.
type MockedStorageProvider = { [K in keyof StorageProvider]: ReturnType<typeof vi.fn> };

describe('UploadsService', () => {
  let service: UploadsService;

  const mockRepository = { createUploadRecord: vi.fn() };
  const mockStorage: MockedStorageProvider = {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    signedUrl: vi.fn(),
    publicUrl: vi.fn(),
  };

  const mockUser: SessionUser = {
    id: 'user-1',
    email: 'user@test.com',
    username: 'user',
    displayName: 'Test User',
    roles: [Role.VRATARTHI],
    avatarUrl: null,
    language: 'EN',
  } as SessionUser;

  beforeEach(async () => {
    mockStorage.put.mockResolvedValue({ url: 'https://storage.example/uploads/generated-key.jpg' });
    heicConvertMock.mockResolvedValue(Buffer.from('converted-jpeg'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: UploadsRepository, useValue: mockRepository },
        { provide: STORAGE_PROVIDER, useValue: mockStorage },
        // Deployed environments set PUBLIC_API_ORIGIN; locally web and api share an origin, so
        // the default is empty and the URL stays relative. Tests assert the relative form.
        { provide: ConfigService, useValue: { get: (_k: string, d: string) => d } },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadChatImage', () => {
    it('uploads a valid image and records it', async () => {
      mockRepository.createUploadRecord.mockResolvedValue({ id: 'upload-1' });
      const result = await service.uploadChatImage(
        {
          fileBuffer: Buffer.from('fake image data').toString('base64'),
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
          roomId: 'chat:user1:user2',
        },
        mockUser,
      );
      expect(result.url).toBeDefined();
      expect(mockStorage.put).toHaveBeenCalledOnce();
      expect(mockRepository.createUploadRecord).toHaveBeenCalled();
    });

    it('stores under a randomized path, not the original filename', async () => {
      mockRepository.createUploadRecord.mockResolvedValue({ id: 'upload-1' });
      await service.uploadChatImage(
        {
          fileBuffer: Buffer.from('x').toString('base64'),
          filename: 'secret-name.png',
          mimeType: 'image/png',
        },
        mockUser,
      );
      const key = mockStorage.put.mock.calls[0][0] as string;
      expect(key).not.toContain('secret-name');
      // No `uploads/` prefix — the container is already called that, and carrying both
      // produced /uploads/uploads/<uuid>.ext in every stored URL (#178).
      expect(key).toMatch(/^[0-9a-f-]+\.png$/);
    });

    // #178: an image in a private chat was readable by anyone holding its URL, permanently.
    // These pin the two halves of the fix — WHERE a file is written, and WHAT is handed back.
    describe('visibility by purpose (#178)', () => {
      const png = {
        fileBuffer: Buffer.from('x').toString('base64'),
        filename: 'a.png',
        mimeType: 'image/png',
      };

      beforeEach(() => {
        // Shared module-level mocks: without this, `calls[0]` is whatever an earlier test left
        // behind. Asserting on `lastCall` below makes each case independent of ordering too.
        vi.clearAllMocks();
        mockRepository.createUploadRecord.mockResolvedValue({ id: 'u1' });
      });

      it.each([
        ['chat', 'private'],
        ['experience', 'private'],
        ['blog', 'public'],
      ])('stores a %s upload in the %s container', async (purpose, expected) => {
        await service.uploadImage(png, mockUser, purpose as UploadPurpose);
        expect(mockStorage.put.mock.lastCall?.[3]).toBe(expected);
      });

      it('records the purpose, so the resolver never has to guess who may see a key', async () => {
        await service.uploadImage(png, mockUser, 'experience');
        expect(mockRepository.createUploadRecord.mock.lastCall?.[3]).toBe('experience');
      });

      it('returns an application URL, never the blob address', async () => {
        mockStorage.put.mockResolvedValue({ url: 'https://acct.blob.core.windows.net/x/y.png' });
        const { url } = await service.uploadImage(png, mockUser, 'chat');

        // What goes into a Tiptap AST and is never rewritten. A signature would expire inside
        // stored content; a storage hostname would outlive the provider that issued it.
        expect(url).toMatch(/^\/api\/v1\/uploads\/[0-9a-f-]+\.png$/);
        expect(url).not.toContain('blob.core.windows.net');
        expect(url).not.toContain('?');
      });
    });

    it('rejects non-image file types', async () => {
      await expect(
        service.uploadChatImage(
          { fileBuffer: 'fake pdf', filename: 'test.pdf', mimeType: 'application/pdf' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockStorage.put).not.toHaveBeenCalled();
    });

    it('rejects files exceeding the size limit', async () => {
      await expect(
        service.uploadChatImage(
          {
            fileBuffer: Buffer.alloc(11 * 1024 * 1024).toString('base64'),
            filename: 'large.jpg',
            mimeType: 'image/jpeg',
          },
          mockUser,
        ),
      ).rejects.toThrow(PayloadTooLargeException);
      expect(mockStorage.put).not.toHaveBeenCalled();
    });

    it('accepts all supported image types', async () => {
      mockRepository.createUploadRecord.mockResolvedValue({ id: 'upload-1' });
      for (const mimeType of ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
        const result = await service.uploadChatImage(
          { fileBuffer: Buffer.from('x').toString('base64'), filename: 'f', mimeType },
          mockUser,
        );
        expect(result.url).toBeDefined();
      }
    });

    it('converts HEIC to JPEG and stores it as .jpg', async () => {
      mockRepository.createUploadRecord.mockResolvedValue({ id: 'upload-1' });
      const result = await service.uploadChatImage(
        {
          fileBuffer: Buffer.from('fake heic').toString('base64'),
          filename: 'IMG_0001.heic',
          mimeType: 'image/heic',
        },
        mockUser,
      );
      expect(heicConvertMock).toHaveBeenCalledOnce();
      const [key, , contentType] = mockStorage.put.mock.calls[0] as [string, Buffer, string];
      // No `uploads/` prefix — the container is already called that, and carrying both
      // produced /uploads/uploads/<uuid>.ext in every stored URL (#178).
      expect(key).toMatch(/^[0-9a-f-]+\.jpg$/);
      // Stored object is the converted JPEG with the corrected content type.
      expect(contentType).toBe('image/jpeg');
      expect(result.url).toBeDefined();
    });

    it('rejects a HEIC file when conversion fails', async () => {
      heicConvertMock.mockRejectedValue(new Error('bad heic'));
      await expect(
        service.uploadChatImage(
          {
            fileBuffer: Buffer.from('x').toString('base64'),
            filename: 'b.heic',
            mimeType: 'image/heic',
          },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockStorage.put).not.toHaveBeenCalled();
    });

    it('reports 503 when the storage provider itself fails, without leaking the cause', async () => {
      mockStorage.put.mockRejectedValue(new Error('network blip'));
      await expect(
        service.uploadChatImage(
          {
            fileBuffer: Buffer.from('x').toString('base64'),
            filename: 'f.jpg',
            mimeType: 'image/jpeg',
          },
          mockUser,
        ),
      ).rejects.toMatchObject({ status: 503 });
    });
  });
});
