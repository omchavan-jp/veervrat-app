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
