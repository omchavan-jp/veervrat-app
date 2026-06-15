import { Injectable } from '@nestjs/common';
import { JourneyState, NotificationEventType, VmRelationshipState } from '@prisma/client';
import { JourneysRepository } from './journeys.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { CreateJourneyDto } from './dto/create-journey.dto';
import type { SessionUser } from '../auth/types/auth.types';
import { hasPermission } from '../../common/permissions/has-permission';
import { isVa, isVm, type JourneySlim } from '../../common/permissions/types';
import {
  EntityNotFoundException,
  AccessDeniedException,
  JourneyConflictException,
  InvalidStateTransitionException,
} from '../../common/exceptions/app.exceptions';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JourneysService {
  constructor(
    private readonly journeysRepository: JourneysRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createJourney(user: SessionUser, dto: CreateJourneyDto) {
    const existing = await this.journeysRepository.findActiveForSentence(user.id, dto.sentenceId);
    if (existing) {
      throw new JourneyConflictException(existing.id, existing.state);
    }

    // Default title to sentence text (truncated)
    let title = dto.title;
    if (!title) {
      const sentence = await this.prisma.sentence.findUnique({
        where: { id: dto.sentenceId },
        select: { textEn: true },
      });
      title = (sentence?.textEn ?? 'My Journey').slice(0, 100);
    }

    const journey = await this.journeysRepository.create({
      vratarthiId: user.id,
      sentenceId: dto.sentenceId,
      weaknessId: dto.weaknessId,
      title,
    });

    return journey;
  }

  async listJourneys(user: SessionUser, cursor?: string) {
    return this.journeysRepository.findAll(user.id, cursor);
  }

  async getJourney(user: SessionUser, id: string) {
    const journey = await this.journeysRepository.findById(id);
    if (!journey) throw new EntityNotFoundException('Journey', id);

    const slim = this.journeysRepository.buildJourneySlim(journey);
    if (!hasPermission(user, { type: 'journey', journey: slim }, 'journey.view')) {
      throw new AccessDeniedException();
    }

    return journey;
  }

  // Cross-module helper: the permission-slim for a journey (or null if absent).
  // Lets other modules (e.g. experience-logs) authorize journey-scoped resources
  // without reaching into the journeys repository directly.
  async getJourneySlim(id: string): Promise<JourneySlim | null> {
    const journey = await this.journeysRepository.findById(id);
    return journey ? this.journeysRepository.buildJourneySlim(journey) : null;
  }

  async getActivity(user: SessionUser, id: string) {
    const journey = await this.journeysRepository.findById(id);
    if (!journey) throw new EntityNotFoundException('Journey', id);

    const slim = this.journeysRepository.buildJourneySlim(journey);
    if (!hasPermission(user, { type: 'journey', journey: slim }, 'journey.view')) {
      throw new AccessDeniedException();
    }

    return this.journeysRepository.getActivity(id);
  }

  async updateState(user: SessionUser, id: string, action: 'pause' | 'resume') {
    const journey = await this.journeysRepository.findById(id);
    if (!journey) throw new EntityNotFoundException('Journey', id);

    const slim = this.journeysRepository.buildJourneySlim(journey);
    const permAction = action === 'pause' ? 'journey.pause' : 'journey.resume';
    if (!hasPermission(user, { type: 'journey', journey: slim }, permAction)) {
      throw new AccessDeniedException();
    }

    const { state } = journey;
    if (action === 'pause' && state !== JourneyState.ACTIVE) {
      throw new InvalidStateTransitionException(state, 'pause');
    }
    if (action === 'resume' && state !== JourneyState.PAUSED && state !== JourneyState.DORMANT) {
      throw new InvalidStateTransitionException(state, 'resume');
    }

    const newState = action === 'pause' ? JourneyState.PAUSED : JourneyState.ACTIVE;
    return this.journeysRepository.updateState(id, newState);
  }

  async submitCompletion(user: SessionUser, journeyId: string) {
    const journey = await this.journeysRepository.findById(journeyId);
    if (!journey) throw new EntityNotFoundException('Journey', journeyId);

    const slim = this.journeysRepository.buildJourneySlim(journey);

    if (!isVa(user) || !hasPermission(user, { type: 'journey', journey: slim }, 'journey.complete')) {
      throw new AccessDeniedException();
    }

    if (journey.state !== JourneyState.ACTIVE) {
      throw new InvalidStateTransitionException(journey.state, 'complete');
    }

    const activeAssignment = slim.vmAssignments.find((a) => a.state === VmRelationshipState.ACTIVE);

    if (!activeAssignment) {
      const updated = await this.journeysRepository.setCompleted(journeyId);
      return updated;
    }

    const vmId = activeAssignment.vmId;
    await this.journeysRepository.markCompletionSubmitted(journeyId);
    await this.notificationsRepository.create(
      vmId,
      user.id,
      NotificationEventType.JOURNEY_COMPLETION_SUBMITTED,
      'journey',
      journeyId,
    );
    return { status: 'pending_vm_approval' as const };
  }

  async approveCompletion(user: SessionUser, journeyId: string) {
    const journey = await this.journeysRepository.findById(journeyId);
    if (!journey) throw new EntityNotFoundException('Journey', journeyId);

    const slim = this.journeysRepository.buildJourneySlim(journey);

    if (!isVm(user) || !hasPermission(user, { type: 'journey', journey: slim }, 'journey.complete')) {
      throw new AccessDeniedException();
    }

    if (journey.state !== JourneyState.ACTIVE) {
      throw new InvalidStateTransitionException(journey.state, 'complete');
    }

    const updated = await this.journeysRepository.setCompleted(journeyId);
    await this.notificationsRepository.create(
      journey.vratarthiId,
      user.id,
      NotificationEventType.JOURNEY_COMPLETION_APPROVED,
      'journey',
      journeyId,
    );
    return updated;
  }

  async updateTitle(user: SessionUser, id: string, title: string) {
    const journey = await this.journeysRepository.findById(id);
    if (!journey) throw new EntityNotFoundException('Journey', id);

    const slim = this.journeysRepository.buildJourneySlim(journey);
    if (!hasPermission(user, { type: 'journey', journey: slim }, 'journey.view')) {
      throw new AccessDeniedException();
    }

    // Only the VA owner can edit the title
    if (journey.vratarthiId !== user.id) throw new AccessDeniedException();

    return this.journeysRepository.updateTitle(id, title);
  }
}
