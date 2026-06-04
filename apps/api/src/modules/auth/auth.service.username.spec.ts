import { describe, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service';

function makeRepo(takenUsernames: string[] = []) {
  return {
    findUserByUsername: vi.fn().mockImplementation(async (u: string) =>
      takenUsernames.includes(u) ? { id: 'some-user' } : null,
    ),
  };
}

function makeService(repo: ReturnType<typeof makeRepo>) {
  const service = Object.create(AuthService.prototype) as AuthService;
  (service as unknown as Record<string, unknown>)['authRepository'] = repo;
  return service;
}

// Access private method via prototype cast for unit testing
async function gen(email: string, taken: string[] = []) {
  const service = makeService(makeRepo(taken));
  return (service as unknown as { generateUsername(e: string): Promise<string> }).generateUsername(email);
}

describe('AuthService — generateUsername', () => {
  it('converts dots and hyphens to underscores', async () => {
    expect(await gen('omchavan.dev@gmail.com')).toBe('omchavan_dev');
  });

  it('strips characters that are not a-z 0-9 _', async () => {
    expect(await gen('om+test@gmail.com')).toBe('omtest');
  });

  it('collapses consecutive underscores', async () => {
    expect(await gen('om..chavan@gmail.com')).toBe('om_chavan');
  });

  it('lowercases the result', async () => {
    expect(await gen('OmChavan@gmail.com')).toBe('omchavan');
  });

  it('clamps to 28 characters', async () => {
    const result = await gen('averylongemailusernamethatexceedslimit@gmail.com');
    expect(result.length).toBeLessThanOrEqual(28);
  });

  it('falls back to base_2 when base is taken', async () => {
    expect(await gen('omchavan.dev@gmail.com', ['omchavan_dev'])).toBe('omchavan_dev_2');
  });

  it('falls back to base_3 when base and base_2 are taken', async () => {
    expect(await gen('omchavan.dev@gmail.com', ['omchavan_dev', 'omchavan_dev_2'])).toBe('omchavan_dev_3');
  });

  it('falls back to "user" when local part produces empty string', async () => {
    expect(await gen('+++@gmail.com')).toBe('user');
  });
});
