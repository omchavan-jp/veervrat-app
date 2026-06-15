import { Injectable } from '@nestjs/common';
import { VmRelationshipState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type VmRelationshipRecord = {
  id: string;
  vratarthiId: string;
  vmId: string;
  state: VmRelationshipState;
  acceptedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type JourneyVmAssignmentRecord = {
  id: string;
  journeyId: string;
  vmId: string;
  state: VmRelationshipState;
  acceptedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AffectedJourney = {
  journeyId: string;
  journeyTitle: string;
};

@Injectable()
export class VmRelationshipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createGlobalRelationship(
    vratarthiId: string,
    vmId: string,
    acceptedAt: Date,
  ): Promise<VmRelationshipRecord> {
    return this.prisma.vmRelationship.create({
      data: { vratarthiId, vmId, state: VmRelationshipState.ACTIVE, acceptedAt },
    });
  }

  async findActiveGlobalVm(vratarthiId: string): Promise<VmRelationshipRecord | null> {
    return this.prisma.vmRelationship.findFirst({
      where: { vratarthiId, state: VmRelationshipState.ACTIVE, endedAt: null },
    });
  }

  async endGlobalVm(id: string): Promise<VmRelationshipRecord> {
    return this.prisma.vmRelationship.update({
      where: { id },
      data: { endedAt: new Date() },
    });
  }

  async findActiveJourneyAssignmentsForVm(
    vmId: string,
    vratarthiId: string,
  ): Promise<AffectedJourney[]> {
    const rows = await this.prisma.journeyVmAssignment.findMany({
      where: {
        vmId,
        state: VmRelationshipState.ACTIVE,
        endedAt: null,
        journey: { vratarthiId },
      },
      select: { journeyId: true, journey: { select: { title: true } } },
    });
    return rows.map((r) => ({ journeyId: r.journeyId, journeyTitle: r.journey.title }));
  }

  async createJourneyAssignment(
    journeyId: string,
    vmId: string,
    acceptedAt: Date,
  ): Promise<JourneyVmAssignmentRecord> {
    return this.prisma.journeyVmAssignment.create({
      data: { journeyId, vmId, state: VmRelationshipState.ACTIVE, acceptedAt },
    });
  }

  async findActiveJourneyAssignment(
    journeyId: string,
    vmId: string,
  ): Promise<JourneyVmAssignmentRecord | null> {
    return this.prisma.journeyVmAssignment.findFirst({
      where: { journeyId, vmId, state: VmRelationshipState.ACTIVE, endedAt: null },
    });
  }

  async endJourneyAssignment(id: string): Promise<JourneyVmAssignmentRecord> {
    return this.prisma.journeyVmAssignment.update({
      where: { id },
      data: { endedAt: new Date() },
    });
  }

  // Aggregates a vratarthi's VM context: their active global VM (if any) and every
  // active journey VM assignment across their journeys. Shaped for permission checks
  // that aren't tied to a single journey (e.g. test result viewing — spec/05
  // test.view_results: owner + their global/journey VMs).
  async getVratarthiVmContext(vratarthiId: string): Promise<{
    globalVmRelationship: { vmId: string; vratarthiId: string; state: VmRelationshipState } | null;
    vmAssignments: { vmId: string; state: VmRelationshipState }[];
  }> {
    const globalVm = await this.prisma.vmRelationship.findFirst({
      where: { vratarthiId, state: VmRelationshipState.ACTIVE, endedAt: null },
      select: { vmId: true, vratarthiId: true, state: true },
    });

    const assignments = await this.prisma.journeyVmAssignment.findMany({
      where: {
        state: VmRelationshipState.ACTIVE,
        endedAt: null,
        journey: { vratarthiId },
      },
      distinct: ['vmId'],
      select: { vmId: true, state: true },
    });

    return { globalVmRelationship: globalVm, vmAssignments: assignments };
  }

  // Journeys this user is the assigned *journey* VM for. This is the scope of the VM
  // guidance/approval queue — strictly per-journey assignment, NOT global VM (spec/22
  // flag: "scope the approval queue strictly to journeys this VM is assigned to — not
  // all VAs"). A global VM views VA data elsewhere; approval requires journey assignment
  // (erc.approve_closure / journey.complete are "assigned journey VM" in spec/05).
  async getVmAssignedJourneys(vmId: string): Promise<{ journeyId: string; vratarthiId: string }[]> {
    const rows = await this.prisma.journeyVmAssignment.findMany({
      where: { vmId, state: VmRelationshipState.ACTIVE, endedAt: null, journey: { deletedAt: null } },
      select: { journeyId: true, journey: { select: { vratarthiId: true } } },
    });
    return rows.map((r) => ({ journeyId: r.journeyId, vratarthiId: r.journey.vratarthiId }));
  }

  // True if the user holds ANY active VM assignment — global or journey-level. Drives
  // VM nav visibility (spec/22: nav items show for users with active VM assignments,
  // global or journey-level), independent of whether the guidance queue has items.
  async hasAnyVmAssignment(vmId: string): Promise<boolean> {
    const [journeyCount, globalCount] = await Promise.all([
      this.prisma.journeyVmAssignment.count({
        where: { vmId, state: VmRelationshipState.ACTIVE, endedAt: null },
      }),
      this.prisma.vmRelationship.count({
        where: { vmId, state: VmRelationshipState.ACTIVE, endedAt: null },
      }),
    ]);
    return journeyCount + globalCount > 0;
  }

  // True if userA and userB have ANY active VM relationship (global or journey-scoped),
  // in either direction (one is VA, the other is VM). Used to authorize 1:1 chat rooms.
  async hasActiveRelationshipBetween(userA: string, userB: string): Promise<boolean> {
    const globalCount = await this.prisma.vmRelationship.count({
      where: {
        state: VmRelationshipState.ACTIVE,
        endedAt: null,
        OR: [
          { vratarthiId: userA, vmId: userB },
          { vratarthiId: userB, vmId: userA },
        ],
      },
    });
    if (globalCount > 0) return true;

    const journeyCount = await this.prisma.journeyVmAssignment.count({
      where: {
        state: VmRelationshipState.ACTIVE,
        endedAt: null,
        OR: [
          { vmId: userA, journey: { vratarthiId: userB } },
          { vmId: userB, journey: { vratarthiId: userA } },
        ],
      },
    });
    return journeyCount > 0;
  }

  async getMyVms(vratarthiId: string, scope?: 'GLOBAL' | 'JOURNEY') {
    let globalVm = null;
    let journeyVms: any[] = [];

    if (!scope || scope === 'GLOBAL') {
      globalVm = await this.prisma.vmRelationship.findFirst({
        where: {
          vratarthiId,
          state: VmRelationshipState.ACTIVE,
          endedAt: null,
        },
        include: {
          vm: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      });
    }

    if (!scope || scope === 'JOURNEY') {
      journeyVms = await this.prisma.journeyVmAssignment.findMany({
        where: {
          journey: {
            vratarthiId,
          },
          state: VmRelationshipState.ACTIVE,
          endedAt: null,
        },
        distinct: ['vmId'],
        include: {
          vm: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
          journey: {
            select: {
              id: true,
            },
          },
        },
      });
    }

    const vms: any[] = [];
    const vmIds = new Set<string>();

    if (globalVm) {
      vms.push({
        id: globalVm.vm.id,
        displayName: globalVm.vm.displayName,
        username: globalVm.vm.username,
        avatarUrl: globalVm.vm.avatarUrl,
        scope: 'GLOBAL',
        assignedJourneys: [],
      });
      vmIds.add(globalVm.vm.id);
    }

    journeyVms.forEach((ja) => {
      const existingVm = vms.find((v) => v.id === ja.vm.id);
      if (existingVm) {
        existingVm.assignedJourneys.push(ja.journey.id);
      } else {
        vms.push({
          id: ja.vm.id,
          displayName: ja.vm.displayName,
          username: ja.vm.username,
          avatarUrl: ja.vm.avatarUrl,
          scope: 'JOURNEY',
          assignedJourneys: [ja.journey.id],
        });
        vmIds.add(ja.vm.id);
      }
    });

    return vms;
  }
}
