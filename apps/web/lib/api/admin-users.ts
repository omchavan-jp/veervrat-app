export type AdminCapability = 'FEEDBACK_WIDGET' | 'CONTENT_EDIT' | 'CONTENT_SUGGEST';
import { api } from './client';

type Wrapped<T> = { data: T };

export type AdminRole = 'VRATARTHI' | 'VRATMITRA' | 'MODERATOR' | 'ADMIN';

export type AdminUserRow = {
  id: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  suspendedAt: string | null;
  anonymisedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  roles: { role: AdminRole }[];
  capabilities?: { capability: AdminCapability; grantedAt: string; grantedBy: string | null }[];
};

export type NameRef = { id: string; nameEn: string; nameMr: string | null };

export type AdminUserDetail = AdminUserRow & {
  gender: string | null;
  dob: string | null;
  language: string;
  emailVerifiedAt: string | null;
  onboardingCompletedAt: string | null;
  journeys: {
    id: string;
    title: string;
    state: string;
    createdAt: string;
    sentence: { id: string; textEn: string; textMr: string | null } | null;
    weaknesses: NameRef[];
  }[];
  testAttempts: {
    id: string;
    weakness: NameRef;
    isDraft: boolean;
    submittedAt: string | null;
    createdAt: string;
  }[];
  experienceLogs: { id: string; visibility: string; isDraft: boolean; createdAt: string }[];
};

export type AdminUserList = { items: AdminUserRow[]; nextCursor: string | null };

export const adminUsersApi = {
  list: (q?: string, cursor?: string) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (cursor) p.set('cursor', cursor);
    const qs = p.toString();
    return api.get<Wrapped<AdminUserList>>(`/admin/users${qs ? `?${qs}` : ''}`).then((r) => r.data);
  },
  detail: (id: string) =>
    api.get<Wrapped<AdminUserDetail>>(`/admin/users/${id}`).then((r) => r.data),
  updateRoles: (id: string, body: { add?: AdminRole[]; remove?: AdminRole[] }) =>
    api.patch<Wrapped<unknown>>(`/admin/users/${id}/roles`, body).then((r) => r.data),

  // Capabilities are what a person may TRY (feedback widget, content editor), as opposed to
  // roles, which are who they ARE in Veervrat. Deliberately a separate endpoint and a separate
  // concept — see openspec `capability-grants/design.md`.
  updateCapabilities: (id: string, body: { add?: AdminCapability[]; remove?: AdminCapability[] }) =>
    api.patch<Wrapped<unknown>>(`/admin/users/${id}/capabilities`, body).then((r) => r.data),
  suspend: (id: string, suspended: boolean) =>
    api
      .post<
        Wrapped<{ id: string; suspendedAt: string | null }>
      >(`/admin/users/${id}/suspend`, { suspended })
      .then((r) => r.data),
  forceLogout: (id: string) =>
    api
      .post<Wrapped<{ id: string; loggedOut: boolean }>>(`/admin/users/${id}/force-logout`, {})
      .then((r) => r.data),
  anonymise: (id: string, reason: string) =>
    api
      .post<Wrapped<{ id: string }>>(`/admin/users/${id}/anonymise`, { reason })
      .then((r) => r.data),
  overrideJourneyState: (journeyId: string, state: string, reason: string) =>
    api
      .patch<
        Wrapped<{ id: string; from: string; to: string }>
      >(`/admin/journeys/${journeyId}/state`, { state, reason })
      .then((r) => r.data),
};
