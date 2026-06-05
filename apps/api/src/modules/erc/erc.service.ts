import { Injectable } from '@nestjs/common';
import { ErcStatus, NotificationEventType } from '@prisma/client';
import { ErcRepository, ErcType } from './erc.repository';
import { CustomErcReviewsRepository } from './custom-erc-reviews.repository';
import { JourneysRepository } from '../journeys/journeys.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import {
  EntityNotFoundException,
  AccessDeniedException,
  ErcAlreadySelectedException,
  InvalidErcStatusTransitionException,
  CustomErcAlreadyPendingException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

// Valid forward-only transitions
const VALID_TRANSITIONS: Partial<Record<ErcStatus, ErcStatus[]>> = {
  [ErcStatus.NOT_STARTED]: [ErcStatus.IN_PROGRESS],
  [ErcStatus.IN_PROGRESS]: [ErcStatus.SUBMITTED],
  [ErcStatus.SUBMITTED]: [ErcStatus.APPROVED, ErcStatus.REVISIT],
};

const STATUS_MAP: Record<'in_progress' | 'submitted' | 'approved' | 'revisit', ErcStatus> = {
  in_progress: ErcStatus.IN_PROGRESS,
  submitted: ErcStatus.SUBMITTED,
  approved: ErcStatus.APPROVED,
  revisit: ErcStatus.REVISIT,
};

@Injectable()
export class ErcService {
  constructor(
    private readonly ercRepository: ErcRepository,
    private readonly customErcReviewsRepository: CustomErcReviewsRepository,
    private readonly journeysRepository: JourneysRepository,
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  private async getJourneyAndCheckPermission(user: SessionUser, journeyId: string, action: 'journey.view' | 'erc.select' | 'erc.suggest' | 'erc.approve_closure' | 'erc.revisit' | 'erc.deactivate' | 'erc.remove' | 'custom_erc.create' | 'custom_erc.submit_for_review') {
    const journey = await this.journeysRepository.findById(journeyId);
    if (!journey) throw new EntityNotFoundException('Journey', journeyId);
    const slim = this.journeysRepository.buildJourneySlim(journey);
    if (!hasPermission(user, { type: action === 'journey.view' ? 'journey' : 'erc', journey: slim, ...(action !== 'journey.view' ? { erc: { journeyId, createdById: user.id, status: ErcStatus.NOT_STARTED } } : {}) } as Parameters<typeof hasPermission>[1], action)) {
      throw new AccessDeniedException();
    }
    return { journey, slim };
  }

  async getPool(user: SessionUser, journeyId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'journey.view');
    return this.ercRepository.getPool(journeyId, ercType);
  }

  async selectItem(user: SessionUser, journeyId: string, poolItemId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'erc.select');
    const existing = await this.ercRepository.findByPoolItemId(journeyId, poolItemId, ercType);
    if (existing) throw new ErcAlreadySelectedException();
    return this.ercRepository.selectPoolItem(journeyId, poolItemId, ercType);
  }

  async listItems(user: SessionUser, journeyId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'journey.view');
    return this.ercRepository.listJourneyItems(journeyId, ercType);
  }

  async updateStatus(user: SessionUser, journeyId: string, itemId: string, targetStatusStr: 'in_progress' | 'submitted' | 'approved' | 'revisit', ercType: ErcType) {
    // Status update is a VA-owner action (erc.select is the broadest VA ownership check)
    const { journey, slim } = await this.getJourneyAndCheckPermission(user, journeyId, 'erc.select');
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);

    const targetStatus = STATUS_MAP[targetStatusStr];
    const allowed = VALID_TRANSITIONS[item.status] ?? [];

    if (item.isDeactivated || !allowed.includes(targetStatus)) {
      throw new InvalidErcStatusTransitionException(item.status, targetStatus);
    }

    // APPROVED: only when no active journey VM (self-approve)
    if (targetStatus === ErcStatus.APPROVED) {
      if (!hasPermission(user, { type: 'erc', journey: slim, erc: { journeyId, createdById: user.id, status: item.status } }, 'erc.approve_closure')) {
        throw new AccessDeniedException();
      }
    }

    // REVISIT is a VM-only action via POST .../revisit — VA cannot set it via PATCH /status
    if (targetStatus === ErcStatus.REVISIT) {
      throw new AccessDeniedException();
    }

    return this.ercRepository.updateStatus(itemId, targetStatus, ercType);
  }

  async approveItem(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    const { journey } = await this.getJourneyAndCheckPermission(user, journeyId, 'erc.approve_closure');

    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    if (item.isDeactivated || item.status !== ErcStatus.SUBMITTED) {
      throw new InvalidErcStatusTransitionException(item.status, ErcStatus.APPROVED);
    }

    const updated = await this.ercRepository.updateStatus(itemId, ErcStatus.APPROVED, ercType);
    await this.notificationsRepository.create(
      journey.vratarthiId,
      user.id,
      NotificationEventType.ERC_CLOSURE_APPROVED,
      ercType,
      itemId,
    );
    return updated;
  }

  async revisitItem(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    const { journey } = await this.getJourneyAndCheckPermission(user, journeyId, 'erc.revisit');

    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    if (item.isDeactivated || item.status !== ErcStatus.SUBMITTED) {
      throw new InvalidErcStatusTransitionException(item.status, ErcStatus.REVISIT);
    }

    const updated = await this.ercRepository.updateStatus(itemId, ErcStatus.REVISIT, ercType);
    await this.notificationsRepository.create(
      journey.vratarthiId,
      user.id,
      NotificationEventType.ERC_RETURNED_FOR_REVISIT,
      ercType,
      itemId,
    );
    return updated;
  }

  async deactivate(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'erc.deactivate'); // VA owner only
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    return this.ercRepository.setDeactivated(itemId, true, ercType);
  }

  async reactivate(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'erc.deactivate'); // VA owner only
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    return this.ercRepository.setDeactivated(itemId, false, ercType);
  }

  async remove(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'erc.remove'); // VA owner only
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    await this.ercRepository.remove(itemId, ercType);
  }

  async suggestItem(user: SessionUser, journeyId: string, itemId: string, text: string, ercType: ErcType) {
    const { journey } = await this.getJourneyAndCheckPermission(user, journeyId, 'erc.suggest');
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    const sidenote = await this.ercRepository.upsertSidenote(itemId, user.id, text, ercType);
    await this.notificationsRepository.create(
      journey.vratarthiId,
      user.id,
      NotificationEventType.VM_SUGGESTION_NEW,
      ercType,
      itemId,
    );
    return sidenote;
  }

  async unsuggestItem(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    const { journey } = await this.getJourneyAndCheckPermission(user, journeyId, 'erc.suggest');
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    const sidenote = await this.ercRepository.revokeSidenote(itemId, ercType);
    if (!sidenote) throw new EntityNotFoundException('VmSidenote', itemId);
    await this.notificationsRepository.create(
      journey.vratarthiId,
      user.id,
      NotificationEventType.VM_SUGGESTION_DISMISSED,
      ercType,
      itemId,
    );
  }

  async acknowledgeSidenoteItem(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'erc.select'); // VA owner only
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    const sidenote = await this.ercRepository.acknowledgeSidenote(itemId, ercType);
    if (!sidenote) throw new EntityNotFoundException('VmSidenote', itemId);
    return sidenote;
  }

  async createCustomItem(
    user: SessionUser,
    journeyId: string,
    data: { titleEn: string; descriptionEn?: string; tier?: import('@prisma/client').ExposureTier; durationWeeks?: number; frequencyPerWeek?: number; frequencyLabel?: string; durationDays?: number },
    ercType: ErcType,
  ) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'custom_erc.create');
    return this.ercRepository.createCustomItem(journeyId, user.id, data, ercType);
  }

  async editCustomItem(
    user: SessionUser,
    journeyId: string,
    itemId: string,
    data: { titleEn?: string; descriptionEn?: string; tier?: import('@prisma/client').ExposureTier; durationWeeks?: number; frequencyPerWeek?: number; frequencyLabel?: string; durationDays?: number },
    ercType: ErcType,
  ) {
    const journey = await this.journeysRepository.findById(journeyId);
    if (!journey) throw new EntityNotFoundException('Journey', journeyId);
    const slim = this.journeysRepository.buildJourneySlim(journey);

    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);

    if (!item.isCustom) throw new AccessDeniedException();

    if (!hasPermission(user, { type: 'erc', journey: slim, erc: { journeyId, createdById: item.createdById ?? undefined, status: item.status } }, 'custom_erc.edit')) {
      throw new AccessDeniedException();
    }

    return this.ercRepository.updateCustomItem(itemId, data, ercType);
  }

  async submitForReview(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    const { journey } = await this.getJourneyAndCheckPermission(user, journeyId, 'custom_erc.submit_for_review');

    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);

    if (!item.isCustom) throw new AccessDeniedException();
    if (item.reviewStatus !== null) throw new CustomErcAlreadyPendingException();

    await this.customErcReviewsRepository.create({
      entityType: this.ercRepository.ercTypeToEntityType(ercType),
      submittedById: user.id,
      journeyExposureId: ercType === 'exposure' ? itemId : undefined,
      journeyResolutionId: ercType === 'resolution' ? itemId : undefined,
      journeyChallengeId: ercType === 'challenge' ? itemId : undefined,
    });

    const updated = await this.ercRepository.setReviewStatus(itemId, 'pending', ercType);

    await this.notificationsRepository.create(
      journey.vratarthiId,
      user.id,
      NotificationEventType.CUSTOM_ERC_REVIEW_REQUESTED,
      ercType,
      itemId,
    );

    return updated;
  }
}
