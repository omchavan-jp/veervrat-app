import { Injectable } from '@nestjs/common';
import { ErcStatus } from '@prisma/client';
import { ActionsRepository } from './actions.repository';
import { VmRelationshipsService } from '../vm-relationships/vm-relationships.service';
import { AccessDeniedException } from '../../common/exceptions/app.exceptions';
import { isVa } from '../../common/permissions/types';
import type { SessionUser } from '../auth/types/auth.types';

@Injectable()
export class ActionsService {
  constructor(
    private readonly actionsRepository: ActionsRepository,
    private readonly vmRelationshipsService: VmRelationshipsService,
  ) {}

  // VA work-queue — screen-spec 4 sections, aggregated from live state across the
  // caller's own journeys only.
  async getVaActions(user: SessionUser) {
    if (!isVa(user)) throw new AccessDeniedException();

    const journeys = await this.actionsRepository.findOwnedJourneys(user.id);
    const journeyIds = journeys.map((j) => j.id);

    const [revisit, submitted, suggestions, pendingCompletion, newErc] = await Promise.all([
      this.actionsRepository.findErcItemsByStatus(journeyIds, [ErcStatus.REVISIT]),
      this.actionsRepository.findErcItemsByStatus(journeyIds, [ErcStatus.SUBMITTED]),
      this.actionsRepository.findActiveSidenotes(journeyIds, { onlyUnacknowledged: true }),
      this.actionsRepository.findJourneysPendingCompletion(journeyIds),
      this.actionsRepository.findJourneysWithNewErc(journeys),
    ]);

    const sections = {
      ercRevisit: revisit,
      suggestionsAwaitingDecision: suggestions,
      pendingVmApprovals: submitted,
      newErcAvailable: newErc,
      journeyClosurePending: pendingCompletion,
    };

    return { ...sections, counts: this.summarize(sections) };
  }

  // VM work-queue — screen-spec 5 / spec-22 sections, strictly scoped to journeys the
  // caller oversees as VM (journey-level or global). Empty scope → empty queue.
  async getVmActions(user: SessionUser) {
    // Approval queue is scoped to journeys this VM is *assigned* to (not global-VM
    // oversight). Nav visibility uses the broader "any assignment" check.
    const [scope, hasAssignments] = await Promise.all([
      this.vmRelationshipsService.getVmAssignedJourneys(user.id),
      this.vmRelationshipsService.hasAnyVmAssignment(user.id),
    ]);
    const journeyIds = scope.map((s) => s.journeyId);

    const [closureRequests, pendingCompletion, suggestions, customReviews] = await Promise.all([
      this.actionsRepository.findErcItemsByStatus(journeyIds, [ErcStatus.SUBMITTED]),
      this.actionsRepository.findJourneysPendingCompletion(journeyIds),
      this.actionsRepository.findActiveSidenotes(journeyIds),
      this.actionsRepository.findCustomErcReviews(journeyIds),
    ]);

    // Status updates the VM cares about are their OWN suggestions (was it accepted?).
    const mySuggestions = suggestions.filter((s) => s.vmId === user.id);

    const sections = {
      closureRequests,
      journeyCompletionRequests: pendingCompletion,
      suggestionStatusUpdates: mySuggestions,
      customErcReviewStatus: customReviews,
    };

    // Distinct from "zero pending": drives whether the VM nav items are shown at all.
    return { ...sections, hasAssignments, counts: this.summarize(sections) };
  }

  private summarize(
    sections: Record<string, unknown[]>,
  ): Record<string, number> & { total: number } {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const [key, value] of Object.entries(sections)) {
      counts[key] = value.length;
      total += value.length;
    }
    return { ...counts, total };
  }
}
