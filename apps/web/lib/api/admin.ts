import { api } from './client';
import type { TiptapDoc } from '@/components/chat/message-content';

type Wrapped<T> = { data: T };

// ─── Taxonomy ──────────────────────────────────────────────────────────────────
export type TaxonomyNode = {
  id: string;
  nameEn: string;
  nameMr: string | null;
  description: string | null;
};

export type VirtueInput = { nameEn: string; nameMr?: string; description?: string };
export type SubvirtueInput = VirtueInput & { virtueId: string };
export type WeaknessInput = VirtueInput & { category?: string };

// ─── Shlokas ───────────────────────────────────────────────────────────────────
export type FormalTagInput = { entityType: string; entityId: string };
export type ShlokaInput = {
  devanagariText: string;
  transliteration?: string;
  meaningEn?: string;
  meaningMr?: string;
  sourceCitation?: string;
  looseTags?: string[];
  formalTags?: FormalTagInput[];
};
export type AdminShloka = {
  id: string;
  devanagariText: string;
  transliteration: string | null;
  meaningEn: string | null;
  meaningMr: string | null;
  looseTags: string[];
};
export type ScheduleEntry = { id: string; scheduledDate: string; shloka: AdminShloka };
export type QueueEntry = { id: string; position: number; shloka: AdminShloka };

// ─── Pothi ─────────────────────────────────────────────────────────────────────
export type PothiSectionInput = {
  sectionNumber: number;
  titleEn: string;
  titleMr?: string;
  introText?: string;
  congregationResponse?: string;
  postShlokaCommentary?: string;
  shlokaIds?: string[];
};

// ─── Resources ─────────────────────────────────────────────────────────────────
export type ResourceInput = {
  type: 'FILE' | 'LINK';
  url?: string;
  filePath?: string;
  thumbnailUrl?: string;
  title: string;
  oneLiner?: string;
  description?: TiptapDoc;
  looseTags?: string[];
  formalTags?: FormalTagInput[];
};

export const adminApi = {
  // Taxonomy
  createVirtue: (b: VirtueInput) =>
    api.post<Wrapped<TaxonomyNode>>('/admin/virtues', b).then((r) => r.data),
  updateVirtue: (id: string, b: Partial<VirtueInput>) =>
    api.patch<Wrapped<TaxonomyNode>>(`/admin/virtues/${id}`, b).then((r) => r.data),
  deleteVirtue: (id: string) =>
    api.delete<Wrapped<{ id: string }>>(`/admin/virtues/${id}`).then((r) => r.data),

  createSubvirtue: (b: SubvirtueInput) =>
    api.post<Wrapped<TaxonomyNode>>('/admin/subvirtues', b).then((r) => r.data),
  updateSubvirtue: (id: string, b: Partial<SubvirtueInput>) =>
    api.patch<Wrapped<TaxonomyNode>>(`/admin/subvirtues/${id}`, b).then((r) => r.data),
  deleteSubvirtue: (id: string) =>
    api.delete<Wrapped<{ id: string }>>(`/admin/subvirtues/${id}`).then((r) => r.data),

  createWeakness: (b: WeaknessInput) =>
    api.post<Wrapped<TaxonomyNode>>('/admin/weaknesses', b).then((r) => r.data),
  updateWeakness: (id: string, b: Partial<WeaknessInput>) =>
    api.patch<Wrapped<TaxonomyNode>>(`/admin/weaknesses/${id}`, b).then((r) => r.data),
  deleteWeakness: (id: string) =>
    api.delete<Wrapped<{ id: string }>>(`/admin/weaknesses/${id}`).then((r) => r.data),

  // Shlokas
  createShloka: (b: ShlokaInput) =>
    api.post<Wrapped<AdminShloka>>('/admin/shlokas', b).then((r) => r.data),
  updateShloka: (id: string, b: ShlokaInput) =>
    api.patch<Wrapped<AdminShloka>>(`/admin/shlokas/${id}`, b).then((r) => r.data),
  deleteShloka: (id: string) =>
    api.delete<Wrapped<{ id: string }>>(`/admin/shlokas/${id}`).then((r) => r.data),

  // Scheduling + queue
  listSchedule: () =>
    api.get<Wrapped<ScheduleEntry[]>>('/admin/shlokas/schedule').then((r) => r.data),
  schedule: (date: string, shlokaId: string) =>
    api
      .patch<Wrapped<ScheduleEntry>>('/admin/shlokas/schedule', { date, shlokaId })
      .then((r) => r.data),
  unschedule: (date: string) =>
    api.delete<Wrapped<{ date: string }>>(`/admin/shlokas/schedule/${date}`).then((r) => r.data),
  listQueue: () => api.get<Wrapped<QueueEntry[]>>('/admin/shlokas/queue').then((r) => r.data),
  reorderQueue: (shlokaIds: string[]) =>
    api.patch<Wrapped<QueueEntry[]>>('/admin/shlokas/queue', { shlokaIds }).then((r) => r.data),

  // Pothi
  createPothiSection: (b: PothiSectionInput) =>
    api.post<Wrapped<{ id: string }>>('/admin/pothi/sections', b).then((r) => r.data),
  updatePothiSection: (id: string, b: Partial<PothiSectionInput>) =>
    api.patch<Wrapped<{ id: string }>>(`/admin/pothi/sections/${id}`, b).then((r) => r.data),
  deletePothiSection: (id: string) =>
    api.delete<Wrapped<{ id: string }>>(`/admin/pothi/sections/${id}`).then((r) => r.data),

  // Resources
  createResource: (b: ResourceInput) =>
    api.post<Wrapped<{ id: string }>>('/admin/resources', b).then((r) => r.data),
  updateResource: (id: string, b: Partial<ResourceInput>) =>
    api.patch<Wrapped<{ id: string }>>(`/admin/resources/${id}`, b).then((r) => r.data),
  deleteResource: (id: string) =>
    api.delete<Wrapped<{ id: string }>>(`/admin/resources/${id}`).then((r) => r.data),

  // Featured curation
  featureBlog: (id: string, featured: boolean) =>
    api
      .patch<
        Wrapped<{ id: string; featured: boolean }>
      >(`/moderation/blogs/${id}/featured`, { featured })
      .then((r) => r.data),
  featureExperience: (id: string, featured: boolean) =>
    api
      .patch<
        Wrapped<{ id: string; featured: boolean }>
      >(`/moderation/experiences/${id}/featured`, { featured })
      .then((r) => r.data),
};
