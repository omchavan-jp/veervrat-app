import { Injectable } from '@nestjs/common';
import { EntitySearchRepository, EntitySearchHit } from './entity-search.repository';
import type { SessionUser } from '../auth/types/auth.types';

// Two trigger families map to two entity groups (spec: @ vs # syntax, exact split TBD):
//   'concept' — taxonomy the whole platform shares (weaknesses, virtues, subvirtues, sentences)
//   'mine'    — the caller's own private items (journeys, exposures, resolutions, challenges)
// 'all' searches both. This keeps the API generic — future entity types (shlokas,
// blogs, …) join a group here without changing the transport or the client.
export type EntitySearchScope = 'all' | 'concept' | 'mine';

const PER_TYPE_LIMIT = 5;
const TOTAL_LIMIT = 12;

@Injectable()
export class EntitySearchService {
  constructor(private readonly repo: EntitySearchRepository) {}

  async search(user: SessionUser, query: string, scope: EntitySearchScope): Promise<EntitySearchHit[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const tasks: Promise<EntitySearchHit[]>[] = [];

    if (scope === 'all' || scope === 'concept') {
      tasks.push(
        this.repo.searchWeaknesses(q, PER_TYPE_LIMIT),
        this.repo.searchVirtues(q, PER_TYPE_LIMIT),
        this.repo.searchSubvirtues(q, PER_TYPE_LIMIT),
        this.repo.searchSentences(q, PER_TYPE_LIMIT),
      );
    }
    if (scope === 'all' || scope === 'mine') {
      tasks.push(
        this.repo.searchOwnJourneys(q, user.id, PER_TYPE_LIMIT),
        this.repo.searchOwnErcItems(q, user.id, PER_TYPE_LIMIT),
      );
    }

    const groups = await Promise.all(tasks);
    // Interleave groups so no single entity type dominates the capped result list.
    return interleave(groups).slice(0, TOTAL_LIMIT);
  }
}

function interleave(groups: EntitySearchHit[][]): EntitySearchHit[] {
  const out: EntitySearchHit[] = [];
  const max = Math.max(0, ...groups.map((g) => g.length));
  for (let i = 0; i < max; i++) {
    for (const g of groups) {
      if (i < g.length) out.push(g[i]);
    }
  }
  return out;
}
