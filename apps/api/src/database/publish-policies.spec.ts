import { describe, it, expect, vi } from 'vitest';
import { publishPolicies, type PublishPrisma } from './publish-policies';
import { POLICY_VERSION } from './policy-content';

function makePrisma(stored: Record<string, number | undefined>) {
  return {
    cmsPage: {
      findUnique: vi.fn(({ where }: { where: { key: string } }) =>
        Promise.resolve(
          stored[where.key] === undefined ? null : { version: stored[where.key] as number },
        ),
      ),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

const run = (p: ReturnType<typeof makePrisma>) => publishPolicies(p as unknown as PublishPrisma);

describe('publishPolicies', () => {
  it('creates a document that does not exist yet', async () => {
    const prisma = makePrisma({});
    const outcomes = await run(prisma);

    expect(outcomes.every((o) => o.action === 'published')).toBe(true);
    expect(prisma.cmsPage.create).toHaveBeenCalledTimes(2);
    expect(prisma.cmsPage.update).not.toHaveBeenCalled();
  });

  it('publishes when the code carries a newer version', async () => {
    const prisma = makePrisma({ terms: POLICY_VERSION - 1, privacy: POLICY_VERSION - 1 });
    const outcomes = await run(prisma);

    expect(outcomes.map((o) => o.action)).toEqual(['published', 'published']);
    expect(prisma.cmsPage.update).toHaveBeenCalledTimes(2);
  });

  it('leaves an equal version completely alone', async () => {
    // The case the seed's comment protects: an administrator may have edited the text through
    // the admin panel without raising the version. Overwriting that is data loss.
    const prisma = makePrisma({ terms: POLICY_VERSION, privacy: POLICY_VERSION });
    const outcomes = await run(prisma);

    expect(outcomes.map((o) => o.action)).toEqual(['unchanged', 'unchanged']);
    expect(prisma.cmsPage.update).not.toHaveBeenCalled();
    expect(prisma.cmsPage.create).not.toHaveBeenCalled();
  });

  it('refuses to roll a policy backwards', async () => {
    // A stored version ahead of the image means the deployment is behind the database — an old
    // image redeployed, or a rollback. Publishing would quietly revert the live policy to older
    // text that people have already been asked to accept.
    const prisma = makePrisma({ terms: POLICY_VERSION + 5, privacy: POLICY_VERSION });
    const outcomes = await run(prisma);

    expect(outcomes[0]).toMatchObject({ key: 'terms', action: 'refused-older' });
    expect(prisma.cmsPage.update).not.toHaveBeenCalled();
  });

  it('handles each document independently', async () => {
    const prisma = makePrisma({ terms: POLICY_VERSION - 1, privacy: POLICY_VERSION });
    const outcomes = await run(prisma);

    expect(outcomes.find((o) => o.key === 'terms')?.action).toBe('published');
    expect(outcomes.find((o) => o.key === 'privacy')?.action).toBe('unchanged');
    expect(prisma.cmsPage.update).toHaveBeenCalledTimes(1);
  });

  it('writes both languages, not just English', async () => {
    // A bump that published English and left Marathi at the previous text would be worse than
    // not bumping: half the readers would be shown one policy and consented to another.
    const prisma = makePrisma({ terms: POLICY_VERSION - 1, privacy: POLICY_VERSION - 1 });
    await run(prisma);

    const data = (prisma.cmsPage.update.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.bodyEn).toBeTruthy();
    expect(data.bodyMr).toBeTruthy();
    expect(data.titleMr).toBeTruthy();
  });
});
