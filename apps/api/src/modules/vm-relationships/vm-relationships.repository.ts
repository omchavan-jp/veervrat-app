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
}
