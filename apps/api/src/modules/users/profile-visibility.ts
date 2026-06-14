// Per-field public-profile visibility (spec/10). The fixed set of togglable fields.
// Stored as a JSON map of field → boolean on the user; a missing key means visible
// (all fields are public by default — only an explicit `false` hides a field).

export const PROFILE_FIELDS = [
  'avatar',
  'memberSince',
  'journeysCompleted',
  'journeysActive',
  'testsTaken',
  'weaknesses',
  'exposures',
  'resolutions',
  'challenges',
  'experiences',
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

export type ProfileVisibility = Partial<Record<ProfileField, boolean>>;

export function isFieldVisible(visibility: ProfileVisibility, field: ProfileField): boolean {
  return visibility[field] !== false;
}

// Normalizes arbitrary JSON from the DB into a typed visibility map, dropping
// unknown keys and non-boolean values.
export function parseVisibility(raw: unknown): ProfileVisibility {
  if (!raw || typeof raw !== 'object') return {};
  const out: ProfileVisibility = {};
  for (const field of PROFILE_FIELDS) {
    const v = (raw as Record<string, unknown>)[field];
    if (typeof v === 'boolean') out[field] = v;
  }
  return out;
}
