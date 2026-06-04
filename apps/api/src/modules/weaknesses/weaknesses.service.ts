import { Injectable } from '@nestjs/common';
import type { SessionUser } from '../auth/types/auth.types';
import { WeaknessesRepository } from './weaknesses.repository';
import { EntityNotFoundException } from '../../common/exceptions/app.exceptions';

const CLUSTER_LABELS: Record<string, string> = {
  A: 'Identity & Self-Perception',
  B: 'Will, Effort & Relating',
  C: 'Action & Engagement',
  other: 'Other',
};

@Injectable()
export class WeaknessesService {
  constructor(private readonly weaknessesRepository: WeaknessesRepository) {}

  async listWeaknesses(user?: SessionUser) {
    const weaknesses = await this.weaknessesRepository.findAll(user?.id);

    // Group by cluster
    const groups = new Map<string, typeof weaknesses>();
    for (const w of weaknesses) {
      const key = w.category ?? 'other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(w);
    }

    const clusterOrder = ['A', 'B', 'C', 'other'];
    const clusters = clusterOrder
      .filter((k) => groups.has(k))
      .map((k) => ({
        key: k,
        label: CLUSTER_LABELS[k] ?? k,
        weaknesses: groups.get(k)!,
      }));

    return { clusters };
  }

  async getWeakness(id: string, user?: SessionUser) {
    const weakness = await this.weaknessesRepository.findById(id, user?.id);
    if (!weakness) {
      throw new EntityNotFoundException('Weakness', id);
    }
    return weakness;
  }
}
