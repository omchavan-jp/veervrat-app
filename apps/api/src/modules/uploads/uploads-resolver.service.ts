import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { UploadPurpose as PrismaUploadPurpose } from '@prisma/client';
import { UploadsRepository } from './uploads.repository';
import { STORAGE_PROVIDER, type StorageProvider } from './storage/storage-provider';
import { ExperienceLogsService } from '../experience-logs/experience-logs.service';
import type { SessionUser } from '../auth/types/auth.types';

export type ResolvedUpload =
  | { kind: 'redirect'; url: string }
  | { kind: 'stream'; body: Buffer; contentType: string };

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * Decides who may see an uploaded image, and produces the bytes or URL to serve.
 *
 * The rule, in one sentence: **an attachment's visibility derives from the document that contains
 * it.** Nothing here re-implements the visibility of a log or a chat room; it asks the same code
 * the rest of the application asks, and treats a refusal as a refusal.
 *
 * That matters because the alternatives were tried on paper first and all failed. "Must be signed
 * in" breaks images in published logs, which guests may read. "Uploader, or their vratmitra"
 * breaks the public pool. Both also create a second authority on visibility that has to be kept
 * in agreement with the first, which is the kind of arrangement that is correct on the day it
 * ships and wrong six months later.
 */
@Injectable()
export class UploadsResolverService {
  constructor(
    private readonly uploads: UploadsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(forwardRef(() => ExperienceLogsService))
    private readonly experienceLogs: ExperienceLogsService,
  ) {}

  async resolve(key: string, user: SessionUser | undefined): Promise<ResolvedUpload> {
    const upload = await this.uploads.findByStorageKey(key);

    // One shape for "no such upload" and for "not allowed", deliberately. A distinguishable
    // refusal tells an unauthorised caller that a given key exists and belongs to somebody,
    // which is the thing they would be probing for.
    if (!upload) throw new NotFoundException();

    switch (upload.purpose) {
      case PrismaUploadPurpose.BLOG:
        // Published content, in the public container. Nothing to decide.
        return { kind: 'redirect', url: this.storage.publicUrl(key) };

      case PrismaUploadPurpose.CHAT:
        await this.assertChatParticipant(upload.roomId, user);
        return this.stream(key);

      case PrismaUploadPurpose.EXPERIENCE:
        await this.assertMayViewExperienceImage(upload.experienceLogId, upload.uploaderId, user);
        return this.stream(key);
    }
  }

  /**
   * Chat images need no parent lookup: `room_id` is recorded at upload time, because the composer
   * already knows the room. Room ids are `chat:<userId>:<userId>` with the ids sorted, so
   * membership is an exact check against the two parties.
   */
  private assertChatParticipant(roomId: string | null, user: SessionUser | undefined) {
    if (!user || !roomId) throw new NotFoundException();
    const participants = roomId.split(':').slice(1);
    if (!participants.includes(user.id)) throw new NotFoundException();
    return Promise.resolve();
  }

  /**
   * Delegates entirely to the log. `getOne` already resolves guest access, ONLY_ME, FRIENDS via
   * mutual follows, drafts, and the permission system — and throws when the viewer may not read
   * it. Reusing it means an image can never be visible to someone who cannot read the log it is
   * inside, including as those rules change later.
   */
  private async assertMayViewExperienceImage(
    experienceLogId: string | null,
    uploaderId: string,
    user: SessionUser | undefined,
  ) {
    // An orphan: uploaded while composing, and no log has claimed it — either still being
    // written, or abandoned. Only its uploader may see it. This is the safe reading of "we do
    // not know what this belongs to", and it resolves itself the moment the log is saved.
    if (!experienceLogId) {
      if (!user || user.id !== uploaderId) throw new NotFoundException();
      return;
    }

    try {
      await this.experienceLogs.getOne(user, experienceLogId);
    } catch {
      // `getOne` already refuses in the non-leaking shape; collapse whatever it threw into the
      // same not-found this endpoint uses everywhere else.
      throw new NotFoundException();
    }
  }

  private async stream(key: string): Promise<ResolvedUpload> {
    const body = await this.storage.get(key, 'private');
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    return {
      kind: 'stream',
      body,
      // Derived from the key this service generated, never from anything a caller supplied.
      contentType: CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream',
    };
  }
}
