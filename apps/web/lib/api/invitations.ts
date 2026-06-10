import { api } from './client';

type Wrapped<T> = { data: T };

export type InvitationResult = {
  id: string;
  type: string;
  status: string;
};

export const invitationsApi = {
  accept: (token: string) =>
    api.post<Wrapped<InvitationResult>>(`/invitations/${encodeURIComponent(token)}/accept`).then((r) => r.data),

  decline: (token: string) =>
    api.post<Wrapped<InvitationResult>>(`/invitations/${encodeURIComponent(token)}/decline`).then((r) => r.data),
};
