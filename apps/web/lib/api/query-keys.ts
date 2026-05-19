export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  journeys: {
    all: ['journeys'] as const,
    list: (filters?: Record<string, unknown>) => ['journeys', { ...filters }] as const,
    detail: (id: string) => ['journeys', id] as const,
  },
  assessments: {
    all: ['assessments'] as const,
    detail: (id: string) => ['assessments', id] as const,
  },
} as const;
