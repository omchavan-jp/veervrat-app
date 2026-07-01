import { Injectable } from '@nestjs/common';
import { CheckinStatus, ErcStatus } from '@prisma/client';
import { ResolutionCheckinsRepository } from './resolution-checkins.repository';
import { JourneysRepository } from '../journeys/journeys.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import {
  EntityNotFoundException,
  AccessDeniedException,
  InvalidCheckinStateException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

@Injectable()
export class ResolutionCheckinsService {
  constructor(
    private readonly checkinsRepository: ResolutionCheckinsRepository,
    private readonly journeysRepository: JourneysRepository,
  ) {}

  private async resolveJourney(journeyId: string) {
    const journey = await this.journeysRepository.findById(journeyId);
    if (!journey) throw new EntityNotFoundException('Journey', journeyId);
    return { journey, slim: this.journeysRepository.buildJourneySlim(journey) };
  }

  private async resolveResolution(resolutionId: string, journeyId: string) {
    const resolution = await this.checkinsRepository.findResolutionById(resolutionId);
    if (!resolution || resolution.journeyId !== journeyId) {
      throw new EntityNotFoundException('Resolution', resolutionId);
    }
    return resolution;
  }

  async logCheckin(
    user: SessionUser,
    journeyId: string,
    resolutionId: string,
    status: CheckinStatus,
    note?: string,
  ) {
    const { slim } = await this.resolveJourney(journeyId);

    if (
      !hasPermission(
        user,
        {
          type: 'erc',
          journey: slim,
          erc: { journeyId, createdById: user.id, status: ErcStatus.NOT_STARTED },
        },
        'erc.select',
      )
    ) {
      throw new AccessDeniedException();
    }

    const resolution = await this.resolveResolution(resolutionId, journeyId);

    if (resolution.isDeactivated || resolution.status !== ErcStatus.IN_PROGRESS) {
      throw new InvalidCheckinStateException();
    }

    return this.checkinsRepository.create(resolutionId, status, note);
  }

  async listCheckins(user: SessionUser, journeyId: string, resolutionId: string) {
    const { slim } = await this.resolveJourney(journeyId);

    if (!hasPermission(user, { type: 'journey', journey: slim }, 'journey.view')) {
      throw new AccessDeniedException();
    }

    await this.resolveResolution(resolutionId, journeyId);

    return this.checkinsRepository.listWithStreak(resolutionId);
  }
}
