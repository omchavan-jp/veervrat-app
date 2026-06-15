import { api } from './client';

type Wrapped<T> = { data: T };

export type ActionErcType = 'exposure' | 'resolution' | 'challenge';

export type ActionErcItem = {
  id: string;
  journeyId: string;
  journeyTitle: string;
  vratarthiId: string;
  ercType: ActionErcType;
  status: string;
  titleEn: string;
  titleMr: string | null;
  submittedAt: string | null;
  updatedAt: string;
};

export type ActionSuggestion = {
  id: string;
  vmId: string;
  journeyId: string;
  journeyTitle: string;
  vratarthiId: string;
  ercType: ActionErcType;
  itemId: string;
  itemTitleEn: string;
  itemTitleMr: string | null;
  text: string;
  acknowledgedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type ActionJourney = {
  id: string;
  title: string;
  vratarthiId: string;
  completionSubmittedAt: string | null;
};

export type ActionNewErc = {
  journeyId: string;
  journeyTitle: string;
};

export type ActionCustomReview = {
  id: string;
  journeyId: string;
  journeyTitle: string;
  vratarthiId: string;
  ercType: ActionErcType;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type VaActions = {
  ercRevisit: ActionErcItem[];
  suggestionsAwaitingDecision: ActionSuggestion[];
  pendingVmApprovals: ActionErcItem[];
  newErcAvailable: ActionNewErc[];
  journeyClosurePending: ActionJourney[];
  counts: Record<string, number> & { total: number };
};

export type VmActions = {
  closureRequests: ActionErcItem[];
  journeyCompletionRequests: ActionJourney[];
  suggestionStatusUpdates: ActionSuggestion[];
  customErcReviewStatus: ActionCustomReview[];
  hasAssignments: boolean;
  counts: Record<string, number> & { total: number };
};

export const actionsApi = {
  getVaActions: (): Promise<VaActions> =>
    api.get<Wrapped<VaActions>>('/actions').then((r) => r.data),

  getVmActions: (): Promise<VmActions> =>
    api.get<Wrapped<VmActions>>('/vm-actions').then((r) => r.data),
};
