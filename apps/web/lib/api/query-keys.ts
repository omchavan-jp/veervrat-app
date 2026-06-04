export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  weaknesses: {
    all: ['weaknesses'] as const,
    detail: (id: string) => ['weaknesses', id] as const,
  },
  tests: {
    draft: (weaknessId: string) => ['tests', 'draft', weaknessId] as const,
    detail: (id: string) => ['tests', id] as const,
    report: (id: string) => ['tests', id, 'report'] as const,
  },
  journeys: {
    all: ['journeys'] as const,
    list: (filters?: Record<string, unknown>) => ['journeys', { ...filters }] as const,
    detail: (id: string) => ['journeys', id] as const,
  },
} as const;
