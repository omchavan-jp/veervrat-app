import { Injectable } from '@nestjs/common';
import { ErcStatus } from '@prisma/client';
import { ErcRepository, ErcType } from './erc.repository';
import { JourneysRepository } from '../journeys/journeys.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import {
  EntityNotFoundException,
  AccessDeniedException,
  ErcAlreadySelectedException,
  InvalidErcStatusTransitionException,
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
    private readonly journeysRepository: JourneysRepository,
  ) {}

  private async getJourneyAndCheckPermission(user: SessionUser, journeyId: string, action: 'journey.view' | 'erc.select' | 'erc.deactivate' | 'erc.remove') {
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

    // REVISIT: VM only — the permission check above (erc.select is VA-only) already blocked
    // a non-VM from getting here; double-check for REVISIT
    if (targetStatus === ErcStatus.REVISIT) {
      throw new AccessDeniedException(); // VM approval is item 15
    }

    return this.ercRepository.updateStatus(itemId, targetStatus, ercType);
  }

  async deactivate(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'erc.deactivate');
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    return this.ercRepository.setDeactivated(itemId, true, ercType);
  }

  async reactivate(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'erc.deactivate');
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    return this.ercRepository.setDeactivated(itemId, false, ercType);
  }

  async remove(user: SessionUser, journeyId: string, itemId: string, ercType: ErcType) {
    await this.getJourneyAndCheckPermission(user, journeyId, 'erc.remove');
    const item = await this.ercRepository.findById(itemId, ercType);
    if (!item || item.journeyId !== journeyId) throw new EntityNotFoundException('ERC item', itemId);
    await this.ercRepository.remove(itemId, ercType);
  }
}
