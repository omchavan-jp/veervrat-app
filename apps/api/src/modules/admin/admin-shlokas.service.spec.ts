import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { AdminShlokasService } from './admin-shlokas.service';
import {
  AccessDeniedException,
  EntityNotFoundException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

const base: Omit<SessionUser, 'id' | 'roles'> = {
  email: 'u@x.com', displayName: 'U', username: 'u', language: 'EN', gender: null, dob: null,
  avatarUrl: null, emailVerifiedAt: new Date(), accountSetupCompletedAt: new Date(), onboardingCompletedAt: new Date(),
};
const ADMIN: SessionUser = { ...base, id: 'admin-1', roles: [Role.ADMIN] };
const MOD: SessionUser = { ...base, id: 'mod-1', roles: [Role.MODERATOR] };

const shlokaDoc = { id: 'sh1', devanagariText: 'अ', transliteration: null, meaningEn: null, meaningMr: null, looseTags: [] };

function make(overrides: Record<string, any> = {}) {
  const repo = {
    createShloka: vi.fn().mockResolvedValue(shlokaDoc),
    updateShloka: vi.fn().mockResolvedValue(shlokaDoc),
    findShloka: vi.fn().mockResolvedValue({ id: 'sh1' }),
    deleteShloka: vi.fn().mockResolvedValue({ id: 'sh1' }),
    upsertSchedule: vi.fn().mockResolvedValue({ id: 'sc1' }),
    deleteSchedule: vi.fn().mockResolvedValue({ count: 1 }),
    replaceQueue: vi.fn().mockResolvedValue(undefined),
    listQueue: vi.fn().mockResolvedValue([]),
    countShlokasByIds: vi.fn().mockResolvedValue(2),
    ...overrides,
  } as any;
  const content = { syncShlokaToIndex: vi.fn(), removeShlokaFromIndex: vi.fn() } as any;
  return { service: new AdminShlokasService(repo, content), repo, content };
}

describe('AdminShlokasService', () => {
  it('NEGATIVE: non-admin cannot create a shloka', async () => {
    const { service } = make();
    await expect(service.create(MOD, { devanagariText: 'अ' })).rejects.toBeInstanceOf(AccessDeniedException);
  });

  it('create syncs the index', async () => {
    const { service, content } = make();
    await service.create(ADMIN, { devanagariText: 'अ' });
    expect(content.syncShlokaToIndex).toHaveBeenCalledWith(shlokaDoc);
  });

  it('delete removes from the index', async () => {
    const { service, content } = make();
    await service.remove(ADMIN, 'sh1');
    expect(content.removeShlokaFromIndex).toHaveBeenCalledWith('sh1');
  });

  it('update 404 when shloka missing', async () => {
    const { service } = make({ findShloka: vi.fn().mockResolvedValue(null) });
    await expect(service.update(ADMIN, 'sh1', { devanagariText: 'अ' })).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('schedule parses date to UTC midnight', async () => {
    const { service, repo } = make();
    await service.schedule(ADMIN, { date: '2026-07-01', shlokaId: 'sh1' });
    const passed = repo.upsertSchedule.mock.calls[0][0] as Date;
    expect(passed.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('reorderQueue rejects duplicates', async () => {
    const { service } = make();
    await expect(service.reorderQueue(ADMIN, { shlokaIds: ['a', 'a'] })).rejects.toBeInstanceOf(ValidationException);
  });

  it('reorderQueue rejects unknown shlokas', async () => {
    const { service } = make({ countShlokasByIds: vi.fn().mockResolvedValue(1) });
    await expect(service.reorderQueue(ADMIN, { shlokaIds: ['a', 'b'] })).rejects.toBeInstanceOf(ValidationException);
  });

  it('reorderQueue replaces the queue in order', async () => {
    const { service, repo } = make();
    await service.reorderQueue(ADMIN, { shlokaIds: ['a', 'b'] });
    expect(repo.replaceQueue).toHaveBeenCalledWith(['a', 'b']);
  });
});
