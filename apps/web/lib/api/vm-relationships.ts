import { api } from './client';

type Wrapped<T> = { data: T };

export type MyVm = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  scope: 'GLOBAL' | 'JOURNEY';
  assignedJourneys: string[];
};

// The mirror of MyVm. Deliberately identity plus counts and nothing more: a roster is how a
// vratmitra finds the person, not a window into what that person has written (#193).
export type MyVratarthi = {
  relationshipId: string;
  since: string | null;
  scope: 'GLOBAL' | 'JOURNEY';
  assignedJourneys: string[];
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
  journeyCount: number;
};

export type GlobalVmCascade = 'keep' | 'unassign';

export type RemoveGlobalVmResult = {
  removedVmId: string;
  affectedJourneys: { journeyId: string; journeyTitle: string }[];
  cascade: GlobalVmCascade;
};

export const vmRelationshipsApi = {
  getMyVms: (scope?: 'GLOBAL' | 'JOURNEY') =>
    api
      .get<Wrapped<MyVm[]>>(`/vm-relationships/my-vms${scope ? `?scope=${scope}` : ''}`)
      .then((r) => r.data),

  getMyVratarthis: () =>
    api.get<Wrapped<MyVratarthi[]>>('/vm-relationships/my-vratarthis').then((r) => r.data),

  // Remove the active global VM. cascade controls the outgoing VM's journey assignments
  // (keep = leave them; unassign = also end them). Used for both "remove" and the first
  // half of "change" (then send a fresh global invite via the invitations flow).
  removeGlobalVm: (cascade: GlobalVmCascade) =>
    api
      .delete<Wrapped<RemoveGlobalVmResult>>('/vm-relationships/global', { cascade })
      .then((r) => r.data),
};
