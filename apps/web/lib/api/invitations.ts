import { api } from './client';

type Wrapped<T> = { data: T };

export type InvitationType = 'PLATFORM' | 'VM_GLOBAL' | 'VM_JOURNEY';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELLED';

export type InvitationResult = {
  id: string;
  type: string;
  status: string;
};

export type Invitation = {
  id: string;
  inviteeEmail: string;
  type: InvitationType;
  scopeId: string | null;
  status: InvitationStatus;
  expiresAt: string;
  reminderSentAt: string | null;
  createdAt: string;
  shareMessage: string;
};

export type SendInvitationInput = {
  type: InvitationType;
  inviteeEmail?: string;
  inviteeUsername?: string;
  scopeId?: string;
};

export const invitationsApi = {
  accept: (token: string) =>
    api
      .post<Wrapped<InvitationResult>>(`/invitations/${encodeURIComponent(token)}/accept`)
      .then((r) => r.data),

  decline: (token: string) =>
    api
      .post<Wrapped<InvitationResult>>(`/invitations/${encodeURIComponent(token)}/decline`)
      .then((r) => r.data),

  send: (input: SendInvitationInput) =>
    api.post<Wrapped<Invitation>>('/invitations', input).then((r) => r.data),

  list: () => api.get<Wrapped<Invitation[]>>('/invitations').then((r) => r.data),

  sendReminder: (id: string) =>
    api
      .post<Wrapped<Invitation>>(`/invitations/${encodeURIComponent(id)}/reminder`)
      .then((r) => r.data),

  cancel: (id: string) =>
    api
      .delete<Wrapped<InvitationResult>>(`/invitations/${encodeURIComponent(id)}`)
      .then((r) => r.data),
};
