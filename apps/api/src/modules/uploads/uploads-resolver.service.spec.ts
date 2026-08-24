import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UploadPurpose as PrismaUploadPurpose } from '@prisma/client';
import { UploadsResolverService } from './uploads-resolver.service';
import type { UploadsRepository } from './uploads.repository';
import type { StorageProvider } from './storage/storage-provider';
import type { ExperienceLogsService } from '../experience-logs/experience-logs.service';
import type { SessionUser } from '../auth/types/auth.types';

const asUser = (id: string) => ({ id }) as SessionUser;

const AUTHOR = asUser('author-1');
const OTHER = asUser('other-1');

describe('UploadsResolverService', () => {
  const repo = { findByStorageKey: vi.fn() };
  const storage = { get: vi.fn(), publicUrl: vi.fn() };
  const logs = { getOne: vi.fn() };

  const service = new UploadsResolverService(
    repo as unknown as UploadsRepository,
    storage as unknown as StorageProvider,
    logs as unknown as ExperienceLogsService,
  );

  const upload = (over: Record<string, unknown> = {}) => ({
    id: 'u1',
    uploaderId: AUTHOR.id,
    roomId: null,
    storageKey: 'k.png',
    purpose: PrismaUploadPurpose.EXPERIENCE,
    experienceLogId: null,
    ...over,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    storage.get.mockResolvedValue(Buffer.from('bytes'));
    storage.publicUrl.mockReturnValue('https://cdn.example/k.png');
  });

  it('refuses an unknown key', async () => {
    repo.findByStorageKey.mockResolvedValue(null);
    await expect(service.resolve('nope.png', AUTHOR)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('blog', () => {
    it('redirects to the public URL, with no session required', async () => {
      repo.findByStorageKey.mockResolvedValue(upload({ purpose: PrismaUploadPurpose.BLOG }));
      // Published content. Redirecting keeps it cacheable, which is why it is public at all.
      await expect(service.resolve('k.png', undefined)).resolves.toEqual({
        kind: 'redirect',
        url: 'https://cdn.example/k.png',
      });
      expect(storage.get).not.toHaveBeenCalled();
    });
  });

  describe('chat', () => {
    const room = `chat:${AUTHOR.id}:${OTHER.id}`;
    const chatUpload = upload({ purpose: PrismaUploadPurpose.CHAT, roomId: room });

    it.each([
      ['the sender', AUTHOR],
      ['the other party', OTHER],
    ])('streams to %s', async (_label, user) => {
      repo.findByStorageKey.mockResolvedValue(chatUpload);
      const result = await service.resolve('k.png', user);
      expect(result).toMatchObject({ kind: 'stream', contentType: 'image/png' });
    });

    it('refuses somebody outside the room', async () => {
      repo.findByStorageKey.mockResolvedValue(chatUpload);
      await expect(service.resolve('k.png', asUser('nosy-1'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses a guest', async () => {
      repo.findByStorageKey.mockResolvedValue(chatUpload);
      await expect(service.resolve('k.png', undefined)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not match a user id that merely appears inside the room id', async () => {
      // `chat:` prefix is dropped before comparing, so the literal segment "chat" is never a
      // participant, and a substring match cannot let somebody in.
      repo.findByStorageKey.mockResolvedValue(chatUpload);
      await expect(service.resolve('k.png', asUser('chat'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('experience', () => {
    it('serves an unbound upload to its uploader only', async () => {
      repo.findByStorageKey.mockResolvedValue(upload());
      await expect(service.resolve('k.png', AUTHOR)).resolves.toMatchObject({ kind: 'stream' });

      repo.findByStorageKey.mockResolvedValue(upload());
      await expect(service.resolve('k.png', OTHER)).rejects.toBeInstanceOf(NotFoundException);
      // Never consulted: there is no log to ask.
      expect(logs.getOne).not.toHaveBeenCalled();
    });

    it('asks the log, and serves when the log says yes', async () => {
      repo.findByStorageKey.mockResolvedValue(upload({ experienceLogId: 'log-1' }));
      logs.getOne.mockResolvedValue({ id: 'log-1' });

      await expect(service.resolve('k.png', OTHER)).resolves.toMatchObject({ kind: 'stream' });
      // The point of the whole design: one authority on visibility, not two.
      expect(logs.getOne).toHaveBeenCalledWith(OTHER, 'log-1');
    });

    it('refuses when the log refuses', async () => {
      repo.findByStorageKey.mockResolvedValue(upload({ experienceLogId: 'log-1' }));
      logs.getOne.mockRejectedValue(new Error('not visible'));
      await expect(service.resolve('k.png', OTHER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('serves a guest when the log is readable by guests', async () => {
      // A published, PUBLIC log is readable with no session, so its images must be too —
      // the case that ruled out every "must be signed in" rule.
      repo.findByStorageKey.mockResolvedValue(upload({ experienceLogId: 'log-1' }));
      logs.getOne.mockResolvedValue({ id: 'log-1' });

      await expect(service.resolve('k.png', undefined)).resolves.toMatchObject({ kind: 'stream' });
      expect(logs.getOne).toHaveBeenCalledWith(undefined, 'log-1');
    });
  });

  it('never infers a content type from anything a caller supplied', async () => {
    repo.findByStorageKey.mockResolvedValue(upload({ storageKey: 'k.weird' }));
    const result = await service.resolve('k.weird', AUTHOR);
    expect(result).toMatchObject({ contentType: 'application/octet-stream' });
  });
});
