import { describe, it, expect, vi } from 'vitest';
import { WeaknessesService } from './weaknesses.service';
import { EntityNotFoundException } from '../../common/exceptions/app.exceptions';

const WEAKNESSES = [
  { id: 'w1', nameEn: 'Alpha', nameMr: null, category: 'A', description: null, stats: null },
  { id: 'w2', nameEn: 'Beta', nameMr: null, category: 'B', description: null, stats: null },
  { id: 'w3', nameEn: 'Gamma', nameMr: null, category: 'A', description: null, stats: null },
  { id: 'w4', nameEn: 'Delta', nameMr: null, category: null, description: null, stats: null },
];

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findAll: vi.fn().mockResolvedValue(WEAKNESSES),
    findById: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function makeService(repo: ReturnType<typeof makeRepo>) {
  const service = Object.create(WeaknessesService.prototype) as WeaknessesService;
  (service as unknown as Record<string, unknown>)['weaknessesRepository'] = repo;
  return service;
}

describe('WeaknessesService — listWeaknesses', () => {
  it('groups weaknesses by cluster A/B/C', async () => {
    const service = makeService(makeRepo());
    const result = await service.listWeaknesses();
    expect(result.clusters.map((c) => c.key)).toEqual(expect.arrayContaining(['A', 'B']));
    const clusterA = result.clusters.find((c) => c.key === 'A');
    expect(clusterA?.weaknesses).toHaveLength(2);
  });

  it('groups null category into "other"', async () => {
    const service = makeService(makeRepo());
    const result = await service.listWeaknesses();
    const other = result.clusters.find((c) => c.key === 'other');
    expect(other?.weaknesses).toHaveLength(1);
    expect(other?.weaknesses[0].id).toBe('w4');
  });

  it('returns cluster A before B', async () => {
    const service = makeService(makeRepo());
    const result = await service.listWeaknesses();
    const keys = result.clusters.map((c) => c.key);
    expect(keys.indexOf('A')).toBeLessThan(keys.indexOf('B'));
  });
});

describe('WeaknessesService — getWeakness', () => {
  it('throws EntityNotFoundException for unknown id', async () => {
    const service = makeService(makeRepo());
    await expect(service.getWeakness('unknown-id')).rejects.toThrow(EntityNotFoundException);
  });

  it('returns weakness when found', async () => {
    const weakness = { id: 'w1', nameEn: 'Alpha', nameMr: null, category: 'A', description: null, subvirtues: [], testHistory: [], draftTestId: null };
    const service = makeService(makeRepo({ findById: vi.fn().mockResolvedValue(weakness) }));
    const result = await service.getWeakness('w1');
    expect(result.id).toBe('w1');
  });
});
