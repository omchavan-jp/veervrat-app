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
    activity: (id: string) => ['journeys', id, 'activity'] as const,
  },
  erc: {
    pool: (journeyId: string, type: string) => ['journeys', journeyId, type, 'pool'] as const,
    list: (journeyId: string, type: string) => ['journeys', journeyId, type] as const,
  },
  checkins: {
    list: (journeyId: string, resolutionId: string) =>
      ['journeys', journeyId, 'resolutions', resolutionId, 'checkins'] as const,
  },
  notifications: {
    list: ['notifications', 'list'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    suggestions: ['dashboard', 'suggestions'] as const,
    platformStats: ['dashboard', 'platform-stats'] as const,
  },
  actions: {
    va: ['actions', 'va'] as const,
    vm: ['actions', 'vm'] as const,
  },
  experiences: {
    mine: ['experiences', 'mine'] as const,
    public: ['experiences', 'public'] as const,
    detail: (id: string) => ['experiences', id] as const,
  },
  invitations: {
    list: ['invitations', 'list'] as const,
  },
  blogs: {
    list: ['blogs', 'list'] as const,
    mine: ['blogs', 'mine'] as const,
    detail: (id: string) => ['blogs', id] as const,
    search: (q: string) => ['blogs', 'search', q] as const,
  },
} as const;
