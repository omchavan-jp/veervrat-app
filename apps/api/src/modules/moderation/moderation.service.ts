import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';
import { ModerationRepository } from './moderation.repository';
import { ErcRepository } from '../erc/erc.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { hasPermission } from '../../common/permissions/has-permission';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';
import type { ApproveCustomErcDto } from './dto/approve-custom-erc.dto';

@Injectable()
export class ModerationService {
  constructor(
    private readonly repository: ModerationRepository,
    private readonly ercRepository: ErcRepository,
    private readonly notifications: NotificationsService,
  ) {}

  private assertModerator(user: SessionUser) {
    if (!hasPermission(user, { type: 'platform' }, 'moderator.review_custom_erc')) {
      throw new AccessDeniedException();
    }
  }

  async getQueue(user: SessionUser, cursor?: string) {
    this.assertModerator(user);
    return this.repository.listPending(cursor);
  }

  async getDetail(user: SessionUser, id: string) {
    this.assertModerator(user);
    const detail = await this.repository.findReviewDetail(id);
    if (!detail) throw new EntityNotFoundException('CustomErcReview', id);
    return detail;
  }

  async approve(user: SessionUser, id: string, dto: ApproveCustomErcDto) {
    this.assertModerator(user);
    const review = await this.repository.findReviewById(id);
    if (!review) throw new EntityNotFoundException('CustomErcReview', id);
    if (review.status !== 'pending')
      throw new ConflictException('This submission has already been reviewed.');

    const ercType = this.ercType(review);
    const itemId = this.repository.reviewItemId(review);
    const journeyId = await this.journeyIdOf(itemId, ercType);

    // Apply moderator edits to the custom item before promotion (if any).
    if (dto.edits && Object.keys(dto.edits).length > 0) {
      await this.ercRepository.updateCustomItem(itemId, dto.edits, ercType);
    }

    const { poolId } = await this.repository.approveAndPromote({
      reviewId: id,
      reviewerId: user.id,
      ercType,
      itemId,
      journeyId,
    });

    await this.ercRepository.setReviewStatus(itemId, 'approved', ercType);
    void this.notifications.create(
      review.submittedById,
      user.id,
      NotificationEventType.CUSTOM_ERC_APPROVED,
      ercType,
      itemId,
    );

    return { id, status: 'approved', poolId };
  }

  async reject(user: SessionUser, id: string, reason: string) {
    this.assertModerator(user);
    if (!reason || reason.trim().length === 0)
      throw new BadRequestException('A reason is required to reject.');

    const review = await this.repository.findReviewById(id);
    if (!review) throw new EntityNotFoundException('CustomErcReview', id);
    if (review.status !== 'pending')
      throw new ConflictException('This submission has already been reviewed.');

    const ercType = this.ercType(review);
    const itemId = this.repository.reviewItemId(review);

    await this.repository.setRejected(id, user.id, reason.trim());
    await this.ercRepository.setReviewStatus(itemId, 'rejected', ercType);
    void this.notifications.create(
      review.submittedById,
      user.id,
      NotificationEventType.CUSTOM_ERC_REJECTED,
      ercType,
      itemId,
    );

    return { id, status: 'rejected' };
  }

  private ercType(review: { entityType: import('@prisma/client').ErcEntityType }) {
    return review.entityType === 'EXPOSURE'
      ? 'exposure'
      : review.entityType === 'RESOLUTION'
        ? 'resolution'
        : 'challenge';
  }

  private async journeyIdOf(
    itemId: string,
    ercType: 'exposure' | 'resolution' | 'challenge',
  ): Promise<string> {
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item) throw new EntityNotFoundException('ERC item', itemId);
    return item.journeyId;
  }
}
