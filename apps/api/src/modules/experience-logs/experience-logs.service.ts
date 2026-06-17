import { Injectable, BadRequestException } from '@nestjs/common';
import { ExperienceVisibility } from '@prisma/client';
import { ExperienceLogsRepository, type ExperienceTagInput } from './experience-logs.repository';
import { JourneysService } from '../journeys/journeys.service';
import { FollowsService } from '../follows/follows.service';
import { sanitizeTiptapDoc, InvalidTiptapContentError } from '../../common/tiptap/sanitize';
import { hasPermission } from '../../common/permissions/has-permission';
import { isVa } from '../../common/permissions/types';
import type { JourneySlim, ExperienceLogSlim } from '../../common/permissions/types';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';
import type { CreateExperienceLogDto } from './dto/create-experience-log.dto';
import type { UpdateExperienceLogDto } from './dto/update-experience-log.dto';

@Injectable()
export class ExperienceLogsService {
  constructor(
    private readonly repository: ExperienceLogsRepository,
    private readonly journeysService: JourneysService,
    private readonly followsService: FollowsService,
  ) {}

  private sanitizeBody(body: unknown) {
    try {
      return sanitizeTiptapDoc(body);
    } catch (err) {
      if (err instanceof InvalidTiptapContentError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  async create(user: SessionUser, dto: CreateExperienceLogDto) {
    const journeyId = dto.journeyId ?? null;
    const journey = journeyId ? await this.journeysService.getJourneySlim(journeyId) : null;
    if (journeyId && !journey) throw new EntityNotFoundException('Journey', journeyId);

    // create permission: VA globally, or VA owner for a journey-scoped entry.
    if (!isVa(user) || !hasPermission(user, this.resource(journey, { authorId: user.id, journeyId, visibility: ExperienceVisibility.ONLY_ME, isDraft: true }), 'experience_log.create')) {
      throw new AccessDeniedException();
    }

    const body = this.sanitizeBody(dto.body);
    return this.repository.create({
      authorId: user.id,
      journeyId,
      body,
      tags: this.toTags(dto.tags),
    });
  }

  async update(user: SessionUser, id: string, dto: UpdateExperienceLogDto) {
    const slim = await this.repository.findSlim(id);
    if (!slim) throw new EntityNotFoundException('ExperienceLog', id);

    const journey = slim.journeyId ? await this.journeysService.getJourneySlim(slim.journeyId) : null;
    if (!hasPermission(user, this.resource(journey, slim), 'experience_log.edit')) {
      throw new AccessDeniedException();
    }

    const publishing = dto.isDraft === false && slim.isDraft;
    return this.repository.update(id, {
      ...(dto.body !== undefined ? { body: this.sanitizeBody(dto.body) } : {}),
      ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
      ...(dto.isDraft !== undefined ? { isDraft: dto.isDraft } : {}),
      ...(publishing ? { publishedAt: new Date() } : {}),
      ...(dto.tags !== undefined ? { tags: this.toTags(dto.tags) } : {}),
    });
  }

  async remove(user: SessionUser, id: string) {
    const slim = await this.repository.findSlim(id);
    if (!slim) throw new EntityNotFoundException('ExperienceLog', id);

    const journey = slim.journeyId ? await this.journeysService.getJourneySlim(slim.journeyId) : null;
    if (!hasPermission(user, this.resource(journey, slim), 'experience_log.delete')) {
      throw new AccessDeniedException();
    }
    await this.repository.softDelete(id);
    return { id };
  }

  async getMine(user: SessionUser, cursor?: string) {
    return this.repository.findOwn(user.id, cursor);
  }

  async getOne(user: SessionUser | undefined, id: string) {
    const log = await this.repository.findById(id);
    if (!log) throw new EntityNotFoundException('ExperienceLog', id);

    // Guests (no session) may only see Public, published entries.
    if (!user) {
      if (log.visibility !== ExperienceVisibility.PUBLIC || log.isDraft) {
        throw new EntityNotFoundException('ExperienceLog', id);
      }
      return log;
    }

    const journey = log.journeyId ? await this.journeysService.getJourneySlim(log.journeyId) : null;
    const slim: ExperienceLogSlim = {
      authorId: log.authorId,
      journeyId: log.journeyId,
      visibility: log.visibility,
      isDraft: log.isDraft,
    };
    // Resolve mutual-follow only when it could matter (FRIENDS, not the author).
    const viewerIsFriend =
      log.visibility === ExperienceVisibility.FRIENDS && log.authorId !== user.id
        ? await this.followsService.areMutualFollows(user.id, log.authorId)
        : false;

    if (!hasPermission(user, this.resource(journey, slim, viewerIsFriend), 'experience_log.view')) {
      // Don't leak existence of private entries.
      throw new EntityNotFoundException('ExperienceLog', id);
    }
    return log;
  }

  async getPublicPool(cursor?: string, featured?: boolean) {
    return this.repository.findPublicPool(cursor, featured);
  }

  async getPublicByAuthor(authorId: string, cursor?: string) {
    return this.repository.findPublicByAuthor(authorId, cursor);
  }

  private resource(journey: JourneySlim | null, log: ExperienceLogSlim, viewerIsFriend = false) {
    return { type: 'experience_log' as const, journey, log, viewerIsFriend };
  }

  private toTags(tags?: { entityType: ExperienceTagInput['entityType']; entityId: string }[]): ExperienceTagInput[] {
    return (tags ?? []).map((t) => ({ entityType: t.entityType, entityId: t.entityId }));
  }
}
