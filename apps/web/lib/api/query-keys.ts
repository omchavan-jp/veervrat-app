export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  connectedAccounts: ['users', 'me', 'connected-accounts'] as const,
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
  virtues: {
    list: ['virtues', 'list'] as const,
    virtue: (id: string) => ['virtues', id] as const,
    subvirtue: (id: string) => ['subvirtues', id] as const,
    sentence: (id: string) => ['sentences', id] as const,
  },
  moderation: {
    customErcQueue: ['moderation', 'custom-erc'] as const,
    customErcDetail: (id: string) => ['moderation', 'custom-erc', id] as const,
  },
  admin: {
    schedule: ['admin', 'shlokas', 'schedule'] as const,
    queue: ['admin', 'shlokas', 'queue'] as const,
  },
  adminUsers: {
    list: (q?: string) => ['admin', 'users', q ?? ''] as const,
    detail: (id: string) => ['admin', 'users', id] as const,
  },
  audit: {
    list: (action?: string, actorId?: string) => ['admin', 'audit', action ?? '', actorId ?? ''] as const,
  },
  cms: {
    list: ['cms', 'list'] as const,
    page: (key: string) => ['cms', 'page', key] as const,
  },
  content: {
    pothi: ['content', 'pothi'] as const,
    shlokas: (source?: string) => ['content', 'shlokas', source ?? 'all'] as const,
    shlokaSearch: (q: string) => ['content', 'shlokas', 'search', q] as const,
    shloka: (id: string) => ['content', 'shloka', id] as const,
    today: ['content', 'shloka-today'] as const,
    resources: (type?: string) => ['content', 'resources', type ?? 'all'] as const,
    resource: (id: string) => ['content', 'resource', id] as const,
  },
} as const;
