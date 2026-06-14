import { api } from './client';

type Wrapped<T> = { data: T };

export type EntityRefType =
  | 'weakness'
  | 'virtue'
  | 'subvirtue'
  | 'sentence'
  | 'journey'
  | 'exposure'
  | 'resolution'
  | 'challenge';

export type EntitySearchHit = {
  entityType: EntityRefType;
  entityId: string;
  label: string;
  sublabel: string | null;
};

export type EntitySearchScope = 'all' | 'concept' | 'mine';

export const entitySearchApi = {
  search: (q: string, scope: EntitySearchScope = 'all') =>
    api
      .get<Wrapped<EntitySearchHit[]>>(
        `/entity-search?q=${encodeURIComponent(q)}&scope=${scope}`,
      )
      .then((r) => r.data),
};
