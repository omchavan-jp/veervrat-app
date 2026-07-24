import { Injectable } from '@nestjs/common';
import { FeedbackStatus } from '@prisma/client';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import { hasPermission } from '../../common/permissions';
import type { SessionUser } from '../auth/types/auth.types';
import { FeedbackRepository, FeedbackPage, FeedbackRecord } from './feedback.repository';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

const USER_AGENT_MAX = 300;

@Injectable()
export class FeedbackService {
  constructor(private readonly repository: FeedbackRepository) {}

  // Reporter identity and role are stamped from the session — body values for these
  // fields do not exist on the DTO and are stripped by the validation pipe.
  async create(
    user: SessionUser,
    dto: CreateFeedbackDto,
    userAgent: string | undefined,
  ): Promise<FeedbackRecord> {
    if (!hasPermission(user, { type: 'platform' }, 'feedback.create')) {
      throw new AccessDeniedException();
    }

    return this.repository.create(
      {
        reporterId: user.id,
        // Snapshot — the reporter's roles can change after the report is filed.
        reporterRole: user.roles.join(','),
        type: dto.type,
        title: dto.title,
        description: dto.description,
        route: dto.route,
        locale: dto.locale,
        viewport: dto.viewport,
        userAgent: userAgent?.slice(0, USER_AGENT_MAX),
        commitSha: dto.commitSha,
      },
      user.id,
    );
  }

  async list(
    user: SessionUser,
    includeResolved: boolean,
    cursor?: string,
    pageSize?: number,
  ): Promise<FeedbackPage> {
    if (!hasPermission(user, { type: 'platform' }, 'feedback.read')) {
      throw new AccessDeniedException();
    }
    return this.repository.list(user.id, includeResolved, cursor, pageSize);
  }

  async toggleUpvote(
    user: SessionUser,
    feedbackItemId: string,
  ): Promise<{ hasUpvoted: boolean; upvoteCount: number }> {
    if (!hasPermission(user, { type: 'platform' }, 'feedback.upvote')) {
      throw new AccessDeniedException();
    }
    const item = await this.repository.findById(feedbackItemId);
    if (!item) throw new EntityNotFoundException('Feedback item', feedbackItemId);
    return this.repository.toggleUpvote(feedbackItemId, user.id);
  }

  // previousStatus is included so the audit event can record the full transition.
  async updateStatus(
    user: SessionUser,
    id: string,
    dto: UpdateFeedbackDto,
  ): Promise<FeedbackRecord & { previousStatus: FeedbackStatus }> {
    if (!hasPermission(user, { type: 'platform' }, 'feedback.manage')) {
      throw new AccessDeniedException();
    }
    const item = await this.repository.findById(id);
    if (!item) throw new EntityNotFoundException('Feedback item', id);

    const declineReason =
      dto.status === FeedbackStatus.DECLINED ? (dto.declineReason ?? null) : null;
    const doneNote = dto.status === FeedbackStatus.DONE ? (dto.doneNote ?? null) : null;
    const updated = await this.repository.updateStatus(
      id,
      dto.status,
      { declineReason, doneNote },
      user.id,
    );
    return { ...updated, previousStatus: item.status };
  }
}
