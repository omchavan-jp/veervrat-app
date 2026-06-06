import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsRepository } from './uploads.repository';
import type { SessionUser } from '../auth/types/auth.types';
import { Role } from '@prisma/client';

describe('UploadsService', () => {
  let service: UploadsService;
  let repository: UploadsRepository;

  const mockRepository = {
    createUploadRecord: vi.fn(),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: UploadsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
    repository = module.get<UploadsRepository>(UploadsRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadChatImage', () => {
    it('should upload valid image', async () => {
      const imageBuffer = Buffer.from('fake image data').toString('base64');
      const request = {
        fileBuffer: imageBuffer,
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        roomId: 'chat:user1:user2',
      };

      mockRepository.createUploadRecord.mockResolvedValue({
        id: 'upload-1',
        uploaderId: mockUser.id,
        minioUrl: 'https://minio.local/chat/image.jpg',
        filename: 'test.jpg',
        roomId: 'chat:user1:user2',
        createdAt: new Date(),
      });

      const result = await service.uploadChatImage(request, mockUser);

      expect(result.url).toBeDefined();
      expect(mockRepository.createUploadRecord).toHaveBeenCalled();
    });

    it('should reject non-image file types', async () => {
      const request = {
        fileBuffer: 'fake pdf',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      };

      await expect(service.uploadChatImage(request, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject files exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024).toString('base64');
      const request = {
        fileBuffer: largeBuffer,
        filename: 'large.jpg',
        mimeType: 'image/jpeg',
      };

      await expect(service.uploadChatImage(request, mockUser)).rejects.toThrow(
        PayloadTooLargeException,
      );
    });

    it('should accept supported image types', async () => {
      const imageBuffer = Buffer.from('fake image').toString('base64');
      
      for (const mimeType of ['image/jpeg', 'image/png', 'image/webp']) {
        mockRepository.createUploadRecord.mockResolvedValue({
          id: 'upload-1',
          uploaderId: mockUser.id,
          minioUrl: `https://minio.local/chat/image`,
          filename: 'test.jpg',
          createdAt: new Date(),
        });

        const request = {
          fileBuffer: imageBuffer,
          filename: 'test.jpg',
          mimeType,
        };

        const result = await service.uploadChatImage(request, mockUser);
        expect(result.url).toBeDefined();
      }
    });
  });
});
