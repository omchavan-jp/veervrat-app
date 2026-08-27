import { Injectable } from '@nestjs/common';
import { VmRelationshipState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Shapes for getMyVms — the VM user summary selected in both queries, and the flattened
// result returned to callers (chat gateway, my-vratmitras page).
type VmUserSummary = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};
type VmWithUser = { vm: VmUserSummary };
type JourneyVmWithUser = { vm: VmUserSummary; journey: { id: string } };
export type MyVm = VmUserSummary & { scope: 'GLOBAL' | 'JOURNEY'; assignedJourneys: string[] };

// The mirror of MyVm, seen from the vratmitra's side. Identity, scope and counts only —
// never journey content, weaknesses or anything the person has written.
export type MyVratarthi = MyVm & {
  relationshipId: string;
  since: Date | null;
  joinedAt: Date;
  journeyCount: number;
};

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
      where: { vratarthiId, state: VmRelationshipState.ACTIVE },
    });
  }

  async endGlobalVm(id: string): Promise<VmRelationshipRecord> {
    return this.prisma.vmRelationship.update({
      where: { id },
      data: { state: VmRelationshipState.ENDED, endedAt: new Date() },
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
      where: { journeyId, vmId, state: VmRelationshipState.ACTIVE },
    });
  }

  async endJourneyAssignment(id: string): Promise<JourneyVmAssignmentRecord> {
    return this.prisma.journeyVmAssignment.update({
      where: { id },
      data: { state: VmRelationshipState.ENDED, endedAt: new Date() },
    });
  }

  // Ends every active journey assignment held by `vmId` on `vratarthiId`'s journeys — the
  // `unassign` cascade of a global VM removal (spec/26 R2). Pending approvals are left
  // untouched (no ERC mutation here). Returns the number of assignments ended.
  async endJourneyAssignmentsForVm(vmId: string, vratarthiId: string): Promise<number> {
    const result = await this.prisma.journeyVmAssignment.updateMany({
      where: {
        vmId,
        state: VmRelationshipState.ACTIVE,
        journey: { vratarthiId },
      },
      data: { state: VmRelationshipState.ENDED, endedAt: new Date() },
    });
    return result.count;
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
      where: { vratarthiId, state: VmRelationshipState.ACTIVE },
      select: { vmId: true, vratarthiId: true, state: true },
    });

    const assignments = await this.prisma.journeyVmAssignment.findMany({
      where: {
        state: VmRelationshipState.ACTIVE,
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
      where: {
        vmId,
        state: VmRelationshipState.ACTIVE,
        journey: { deletedAt: null },
      },
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
        where: { vmId, state: VmRelationshipState.ACTIVE },
      }),
      this.prisma.vmRelationship.count({
        where: { vmId, state: VmRelationshipState.ACTIVE },
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
        OR: [
          { vmId: userA, journey: { vratarthiId: userB } },
          { vmId: userB, journey: { vratarthiId: userA } },
        ],
      },
    });
    return journeyCount > 0;
  }

  /**
   * The mirror of `getMyVms`: the people this user is the vratmitra for (#193).
   *
   * Global relationships only. Journey-scoped assignments already have a home in the guidance
   * queue, and a roster is a list of people rather than a list of work.
   *
   * Selects identity and a joined date, and deliberately nothing about what those people are
   * working on. What a vratmitra may read follows from the relationship; a list of names is not
   * the place to disclose weaknesses.
   */
  async listVratarthisForVm(vmId: string): Promise<MyVratarthi[]> {
    const identity = {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { journeys: true } },
    } as const;

    // Both scopes, because `hasAnyVmAssignment` — the gate that decides whether this page is
    // reachable at all — counts both. Querying only global relationships here would send a
    // journey-scoped vratmitra to a page that says they mentor nobody, while they mentor someone.
    const [globals, journeyAssignments] = await Promise.all([
      this.prisma.vmRelationship.findMany({
        where: { vmId, state: VmRelationshipState.ACTIVE },
        orderBy: { acceptedAt: 'desc' },
        select: { id: true, acceptedAt: true, vratarthi: { select: identity } },
      }),
      this.prisma.journeyVmAssignment.findMany({
        where: { vmId, state: VmRelationshipState.ACTIVE },
        orderBy: { acceptedAt: 'desc' },
        select: {
          id: true,
          acceptedAt: true,
          journey: { select: { id: true, vratarthi: { select: identity } } },
        },
      }),
    ]);

    const roster: MyVratarthi[] = [];
    const byId = new Map<string, MyVratarthi>();

    const add = (
      person: {
        id: string;
        displayName: string;
        username: string;
        avatarUrl: string | null;
        createdAt: Date;
        _count: { journeys: number };
      },
      entry: { relationshipId: string; since: Date | null; scope: 'GLOBAL' | 'JOURNEY' },
      journeyId?: string,
    ) => {
      const existing = byId.get(person.id);
      if (existing) {
        // Someone can be both a global vratarthi and hold journey assignments with the same
        // vratmitra. They are one person on this roster, listed once, under the broader scope.
        if (journeyId) existing.assignedJourneys.push(journeyId);
        return;
      }
      const created: MyVratarthi = {
        relationshipId: entry.relationshipId,
        since: entry.since,
        scope: entry.scope,
        assignedJourneys: journeyId ? [journeyId] : [],
        id: person.id,
        displayName: person.displayName,
        username: person.username,
        avatarUrl: person.avatarUrl,
        joinedAt: person.createdAt,
        journeyCount: person._count.journeys,
      };
      byId.set(person.id, created);
      roster.push(created);
    };

    // Global first, so a person who is both is recorded under GLOBAL.
    globals.forEach((r) =>
      add(r.vratarthi, { relationshipId: r.id, since: r.acceptedAt, scope: 'GLOBAL' }),
    );
    journeyAssignments.forEach((a) =>
      add(
        a.journey.vratarthi,
        { relationshipId: a.id, since: a.acceptedAt, scope: 'JOURNEY' },
        a.journey.id,
      ),
    );

    return roster;
  }

  async getMyVms(vratarthiId: string, scope?: 'GLOBAL' | 'JOURNEY'): Promise<MyVm[]> {
    let globalVm: VmWithUser | null = null;
    let journeyVms: JourneyVmWithUser[] = [];

    if (!scope || scope === 'GLOBAL') {
      globalVm = await this.prisma.vmRelationship.findFirst({
        where: {
          vratarthiId,
          state: VmRelationshipState.ACTIVE,
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

    const vms: MyVm[] = [];
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
