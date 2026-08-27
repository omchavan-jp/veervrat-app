import { describe, it, expect, vi } from 'vitest';
import { DataExportService } from './data-export.service';
import type { DataExportRepository } from './data-export.repository';

function makeRepo(overrides: Partial<Record<keyof DataExportRepository, unknown>> = {}) {
  const base = {
    identity: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
    authAccounts: vi.fn().mockResolvedValue([]),
    consents: vi.fn().mockResolvedValue([]),
    testAttempts: vi.fn().mockResolvedValue([]),
    journeys: vi.fn().mockResolvedValue([]),
    experienceLogs: vi.fn().mockResolvedValue([]),
    chatMessages: vi.fn().mockResolvedValue([]),
    blogs: vi.fn().mockResolvedValue([]),
    blogComments: vi.fn().mockResolvedValue([]),
    contentSuggestions: vi.fn().mockResolvedValue([]),
    follows: vi.fn().mockResolvedValue({ following: [], followers: [] }),
    invitations: vi.fn().mockResolvedValue({ sent: [], received: [] }),
    feedbackItems: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return base as unknown as DataExportRepository;
}

describe('DataExportService.exportFor', () => {
  it('gathers every category under its own named key', async () => {
    const repo = makeRepo();
    const result = await new DataExportService(repo).exportFor('u1');

    // Named explicitly rather than spread, so a category silently missing from the returned
    // object is a visible diff here, not a document quietly incomplete.
    expect(Object.keys(result).sort()).toEqual(
      [
        'authAccounts',
        'blogComments',
        'blogs',
        'chatMessages',
        'consents',
        'contentSuggestions',
        'experienceLogs',
        'exportedAt',
        'feedbackItems',
        'follows',
        'identity',
        'invitations',
        'journeys',
        'selfAssessments',
      ].sort(),
    );
  });

  it('queries every category for the requesting user, and only that user', async () => {
    const repo = makeRepo();
    await new DataExportService(repo).exportFor('the-requester');

    for (const key of [
      'identity',
      'authAccounts',
      'consents',
      'testAttempts',
      'journeys',
      'experienceLogs',
      'chatMessages',
      'blogs',
      'blogComments',
      'contentSuggestions',
      'follows',
      'invitations',
      'feedbackItems',
    ] as const) {
      expect(repo[key]).toHaveBeenCalledWith('the-requester');
    }
  });

  it('stamps when the export was produced', async () => {
    const result = await new DataExportService(makeRepo()).exportFor('u1');
    expect(new Date(result.exportedAt).getTime()).not.toBeNaN();
  });
});
