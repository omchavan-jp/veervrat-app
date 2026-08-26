import { describe, it, expect, vi } from 'vitest';
import { VmRelationshipsService } from './vm-relationships.service';
import type { VmRelationshipsRepository } from './vm-relationships.repository';
import type { SessionUser } from '../auth/types/auth.types';

const VM = { id: 'vm-1' } as SessionUser;

function makeService(repo: Partial<VmRelationshipsRepository>) {
  const service = Object.create(VmRelationshipsService.prototype) as VmRelationshipsService;
  (service as unknown as Record<string, unknown>)['vmRelationshipsRepository'] = repo;
  return service;
}

describe('getMyVratarthis — the mirror that did not exist (#193)', () => {
  it('returns the people this user mentors', async () => {
    const repo = {
      listVratarthisForVm: vi
        .fn()
        .mockResolvedValue([
          { id: 'va-1', displayName: 'A Vratarthi', username: 'va_one', journeyCount: 2 },
        ]),
    };

    const result = await makeService(repo).getMyVratarthis(VM);

    expect(result).toHaveLength(1);
    expect(repo.listVratarthisForVm).toHaveBeenCalledWith('vm-1');
  });

  it('returns an empty list for someone who mentors nobody, rather than refusing', async () => {
    // `getMyVms` throws AccessDeniedException for a non-vratarthi, because being one is what
    // makes that question meaningful. Here the relationships answer it: mentoring nobody is the
    // ordinary starting condition for every vratmitra, not a permission problem.
    const repo = { listVratarthisForVm: vi.fn().mockResolvedValue([]) };

    await expect(makeService(repo).getMyVratarthis(VM)).resolves.toEqual([]);
  });
});

describe('what the roster discloses', () => {
  it('carries identity and a joined date, and nothing about journey content', async () => {
    // A list of people is not consent to read what they have written. What a vratmitra may see
    // follows from the relationship; the roster is how you find the person, not their material.
    const repo = {
      listVratarthisForVm: vi.fn().mockResolvedValue([
        {
          relationshipId: 'rel-1',
          since: new Date('2026-08-01'),
          id: 'va-1',
          displayName: 'A Vratarthi',
          username: 'va_one',
          avatarUrl: null,
          joinedAt: new Date('2026-07-01'),
          journeyCount: 2,
        },
      ]),
    };

    const [entry] = await makeService(repo).getMyVratarthis(VM);

    expect(Object.keys(entry).sort()).toEqual(
      [
        'avatarUrl',
        'displayName',
        'id',
        'joinedAt',
        'journeyCount',
        'relationshipId',
        'since',
        'username',
      ].sort(),
    );
    // The named absences matter more than the present keys: these are the fields whose
    // appearance here would be a disclosure.
    for (const leak of ['weaknesses', 'journeys', 'experienceLogs', 'body', 'notes']) {
      expect(entry).not.toHaveProperty(leak);
    }
  });
});
