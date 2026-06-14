import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';
import { UploadsRepository } from './uploads.repository';
import type { SessionUser } from '../auth/types/auth.types';
import { Role } from '@prisma/client';

// Mock the S3 client so uploads resolve without a real MinIO.
// vi.hoisted ensures sendMock exists when the (hoisted) vi.mock factory runs.
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = sendMock;
  },
  PutObjectCommand: class {
    constructor(public input: unknown) {}
  },
}));

// Mock HEIC→JPEG conversion so the test needs no real libheif decode.
const { heicConvertMock } = vi.hoisted(() => ({ heicConvertMock: vi.fn() }));
vi.mock('heic-convert', () => ({ default: heicConvertMock }));

const S3_CONFIG: Record<string, string> = {
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'veervrat-uploads',
  S3_ACCESS_KEY: 'veervrat',
  S3_SECRET_KEY: 'veervrat_local',
};

describe('UploadsService', () => {
  let service: UploadsService;

  const mockRepository = { createUploadRecord: vi.fn() };
  const mockConfig = {
    get: vi.fn((key: string, fallback?: string) => S3_CONFIG[key] ?? fallback),
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
    sendMock.mockResolvedValue({});
    heicConvertMock.mockResolvedValue(Buffer.from('converted-jpeg'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: UploadsRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfig },
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
      expect(result.url).toContain('uploads/');
      expect(sendMock).toHaveBeenCalledOnce();
      expect(mockRepository.createUploadRecord).toHaveBeenCalled();
    });

    it('stores under a randomized path, not the original filename', async () => {
      mockRepository.createUploadRecord.mockResolvedValue({ id: 'upload-1' });
      const result = await service.uploadChatImage(
        {
          fileBuffer: Buffer.from('x').toString('base64'),
          filename: 'secret-name.png',
          mimeType: 'image/png',
        },
        mockUser,
      );
      expect(result.url).not.toContain('secret-name');
      expect(result.url).toMatch(/uploads\/[0-9a-f-]+\.png$/);
    });

    it('rejects non-image file types', async () => {
      await expect(
        service.uploadChatImage(
          { fileBuffer: 'fake pdf', filename: 'test.pdf', mimeType: 'application/pdf' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(sendMock).not.toHaveBeenCalled();
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
      expect(sendMock).not.toHaveBeenCalled();
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
      expect(result.url).toMatch(/uploads\/[0-9a-f-]+\.jpg$/);
      // Stored object is the converted JPEG with the corrected content type.
      const putInput = (sendMock.mock.calls[0][0] as { input: { ContentType: string } }).input;
      expect(putInput.ContentType).toBe('image/jpeg');
    });

    it('rejects a HEIC file when conversion fails', async () => {
      heicConvertMock.mockRejectedValue(new Error('bad heic'));
      await expect(
        service.uploadChatImage(
          { fileBuffer: Buffer.from('x').toString('base64'), filename: 'b.heic', mimeType: 'image/heic' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(sendMock).not.toHaveBeenCalled();
    });
  });
});
