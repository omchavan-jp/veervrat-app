import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';
import { VmRelationshipsRepository } from './vm-relationships.repository';
import { JourneysRepository } from '../journeys/journeys.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import {
  EntityNotFoundException,
  AccessDeniedException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';
import { isVa } from '../../common/permissions/types';

@Injectable()
export class VmRelationshipsService {
  constructor(
    private readonly vmRelationshipsRepository: VmRelationshipsRepository,
    private readonly journeysRepository: JourneysRepository,
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async removeGlobalVm(user: SessionUser) {
    if (!isVa(user)) throw new AccessDeniedException();

    const relationship = await this.vmRelationshipsRepository.findActiveGlobalVm(user.id);
    if (!relationship) throw new EntityNotFoundException('GlobalVmRelationship', user.id);

    const affectedJourneys = await this.vmRelationshipsRepository.findActiveJourneyAssignmentsForVm(relationship.vmId, user.id);
    await this.vmRelationshipsRepository.endGlobalVm(relationship.id);

    return {
      removedVmId: relationship.vmId,
      affectedJourneys,
    };
  }

  async withdrawJourneyVm(user: SessionUser, journeyId: string) {
    const journey = await this.journeysRepository.findById(journeyId);
    if (!journey) throw new EntityNotFoundException('Journey', journeyId);

    const assignment = await this.vmRelationshipsRepository.findActiveJourneyAssignment(journeyId, user.id);
    if (!assignment) throw new AccessDeniedException();

    if (!hasPermission(user, { type: 'vm_relationship', relationship: { vmId: assignment.vmId, vratarthiId: journey.vratarthiId } }, 'vm_relationship.withdraw')) {
      throw new AccessDeniedException();
    }

    await this.vmRelationshipsRepository.endJourneyAssignment(assignment.id);

    // Notify the VA that their journey VM has withdrawn.
    await this.notificationsRepository.create(
      journey.vratarthiId,
      user.id,
      NotificationEventType.VM_WITHDREW,
      'journey',
      journeyId,
    );

    return { journeyId, vmId: user.id };
  }

  async createFromGlobalInvite(
    vratarthiId: string,
    vmId: string,
    acceptedAt: Date,
  ) {
    return this.vmRelationshipsRepository.createGlobalRelationship(vratarthiId, vmId, acceptedAt);
  }

  async createFromJourneyInvite(
    journeyId: string,
    vmId: string,
    acceptedAt: Date,
  ) {
    return this.vmRelationshipsRepository.createJourneyAssignment(journeyId, vmId, acceptedAt);
  }

  async getMyVms(user: SessionUser, scope?: 'GLOBAL' | 'JOURNEY') {
    if (!isVa(user)) throw new AccessDeniedException();
    return this.vmRelationshipsRepository.getMyVms(user.id, scope);
  }
}
