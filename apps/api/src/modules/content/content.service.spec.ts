import { describe, it, expect, vi } from 'vitest';
import { ContentService } from './content.service';
import { EntityNotFoundException } from '../../common/exceptions/app.exceptions';

function make(repo: Record<string, any>, index: Record<string, any> = {}) {
  const idx = { upsert: vi.fn(), remove: vi.fn(), search: vi.fn().mockResolvedValue([]), ...index };
  return { service: new ContentService(repo as never, idx as never), idx };
}

describe('ContentService', () => {
  it('lists pothi sections', async () => {
    const { service } = make({ listPothiSections: vi.fn().mockResolvedValue([{ id: 's1', shlokas: [] }]) });
    expect(await service.getPothiSections()).toHaveLength(1);
  });

  it('lists shlokas with source filter passthrough', async () => {
    const repo = { listShlokas: vi.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    const { service } = make(repo);
    await service.getShlokas('Gita');
    expect(repo.listShlokas).toHaveBeenCalledWith({ source: 'Gita', cursor: undefined });
  });

  it('shloka detail resolves + 404s on unknown', async () => {
    const ok = make({ findShlokaDetail: vi.fn().mockResolvedValue({ id: 'sh1', formalTags: [] }) });
    expect((await ok.service.getShloka('sh1')).id).toBe('sh1');
    const missing = make({ findShlokaDetail: vi.fn().mockResolvedValue(null) });
    await expect(missing.service.getShloka('nope')).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('search: <2 chars empty', async () => {
    const { service } = make({});
    expect(await service.searchShlokas('a')).toEqual([]);
  });

  it('search hydrates index hits', async () => {
    const repo = { findShlokasByIds: vi.fn().mockResolvedValue([{ id: 'sh2' }]) };
    const { service } = make(repo, { search: vi.fn().mockResolvedValue(['sh2']) });
    const res = await service.searchShlokas('atman');
    expect(res).toEqual([{ id: 'sh2' }]);
  });

  it('today: scheduled takes priority', async () => {
    const repo = {
      findScheduledShloka: vi.fn().mockResolvedValue({ id: 'sched' }),
      pickFromQueue: vi.fn().mockResolvedValue({ id: 'queued' }),
    };
    const { service } = make(repo);
    expect((await service.getToday())!.id).toBe('sched');
    expect(repo.pickFromQueue).not.toHaveBeenCalled();
  });

  it('today: falls back to queue', async () => {
    const repo = {
      findScheduledShloka: vi.fn().mockResolvedValue(null),
      pickFromQueue: vi.fn().mockResolvedValue({ id: 'queued' }),
    };
    const { service } = make(repo);
    expect((await service.getToday())!.id).toBe('queued');
  });

  it('today: null when nothing scheduled or queued', async () => {
    const repo = {
      findScheduledShloka: vi.fn().mockResolvedValue(null),
      pickFromQueue: vi.fn().mockResolvedValue(null),
    };
    const { service } = make(repo);
    expect(await service.getToday()).toBeNull();
  });

  it('resources list + detail 404', async () => {
    const ok = make({ listResources: vi.fn().mockResolvedValue({ items: [], nextCursor: null }), findResourceDetail: vi.fn().mockResolvedValue({ id: 'r1', formalTags: [] }) });
    await ok.service.getResources();
    expect((await ok.service.getResource('r1')).id).toBe('r1');
    const missing = make({ findResourceDetail: vi.fn().mockResolvedValue(null) });
    await expect(missing.service.getResource('nope')).rejects.toBeInstanceOf(EntityNotFoundException);
  });
});
