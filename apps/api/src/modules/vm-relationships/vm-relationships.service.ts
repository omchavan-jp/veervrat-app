import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';
import { VmRelationshipsRepository } from './vm-relationships.repository';
import { JourneysRepository } from '../journeys/journeys.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { hasPermission } from '../../common/permissions/has-permission';
import {
  EntityNotFoundException,
  AccessDeniedException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';
import { isVa } from '../../common/permissions/types';
import type { GlobalVmCascade } from './dto/remove-global-vm.dto';

@Injectable()
export class VmRelationshipsService {
  constructor(
    private readonly vmRelationshipsRepository: VmRelationshipsRepository,
    private readonly journeysRepository: JourneysRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Remove (or, as the first half of a "change", clear) the VA's active global VM.
  // `cascade` controls the outgoing VM's journey assignments (spec/26 R2): `keep` leaves
  // them, `unassign` also ends them. Pending approvals are never auto-resolved (spec/04).
  async removeGlobalVm(user: SessionUser, cascade: GlobalVmCascade = 'keep') {
    if (!isVa(user)) throw new AccessDeniedException();

    const relationship = await this.vmRelationshipsRepository.findActiveGlobalVm(user.id);
    if (!relationship) throw new EntityNotFoundException('GlobalVmRelationship', user.id);

    const affectedJourneys = await this.vmRelationshipsRepository.findActiveJourneyAssignmentsForVm(relationship.vmId, user.id);
    await this.vmRelationshipsRepository.endGlobalVm(relationship.id);

    if (cascade === 'unassign') {
      await this.vmRelationshipsRepository.endJourneyAssignmentsForVm(relationship.vmId, user.id);
    }

    // Notify the outgoing VM (emailable VM_WITHDREW via the centralized notification path).
    void this.notificationsService.create(
      relationship.vmId,
      user.id,
      NotificationEventType.VM_WITHDREW,
      'user',
      user.id,
    );

    return {
      removedVmId: relationship.vmId,
      affectedJourneys,
      cascade,
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

  // Journeys this user is the assigned journey VM for — the actionable scope of the VM
  // guidance queue. Global-VM relationships are deliberately excluded (view-only).
  async getVmAssignedJourneys(vmId: string): Promise<{ journeyId: string; vratarthiId: string }[]> {
    return this.vmRelationshipsRepository.getVmAssignedJourneys(vmId);
  }

  // Whether the user holds any active VM assignment (global or journey) — for nav gating.
  async hasAnyVmAssignment(vmId: string): Promise<boolean> {
    return this.vmRelationshipsRepository.hasAnyVmAssignment(vmId);
  }
}
