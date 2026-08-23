import type { PrismaClient } from '@prisma/client';
import { createCliPrisma } from './cli-prisma';
import { POLICY_DOCUMENTS } from './policy-content';

/**
 * Publishes a new version of the policy documents.
 *
 * Separate from the seed on purpose. The seed writes a policy page **only if it does not exist**,
 * so that re-running it never resets a version an administrator raised deliberately, nor
 * overwrites an edit made through the admin panel. That is the right behaviour for a seed and the
 * wrong behaviour for a version bump, so amending the seed would have traded one correct rule for
 * another.
 *
 * The rule here is narrow: write only when the code's version is **greater** than the stored one.
 * An equal version is left alone, which preserves admin edits within a version — the case the
 * seed's comment was protecting. A stored version *higher* than the code's is left alone and
 * reported, because that means the deployed image is behind the database and overwriting would
 * silently roll the policy back.
 *
 * Raising the version is what re-prompts every user for consent, so this is not a routine
 * content deploy — see DEPLOYMENT.md.
 */
export type PublishOutcome = {
  key: string;
  action: 'published' | 'unchanged' | 'refused-older';
  from: number | null;
  to: number;
};

export type PublishPrisma = Pick<PrismaClient, 'cmsPage'>;

export async function publishPolicies(prisma: PublishPrisma): Promise<PublishOutcome[]> {
  const outcomes: PublishOutcome[] = [];

  for (const doc of POLICY_DOCUMENTS) {
    const existing = await prisma.cmsPage.findUnique({
      where: { key: doc.key },
      select: { version: true },
    });

    if (!existing) {
      await prisma.cmsPage.create({
        data: {
          key: doc.key,
          version: doc.version,
          titleEn: doc.titleEn,
          titleMr: doc.titleMr,
          bodyEn: doc.bodyEn as never,
          bodyMr: doc.bodyMr as never,
        },
      });
      outcomes.push({ key: doc.key, action: 'published', from: null, to: doc.version });
      continue;
    }

    if (existing.version > doc.version) {
      outcomes.push({
        key: doc.key,
        action: 'refused-older',
        from: existing.version,
        to: doc.version,
      });
      continue;
    }

    if (existing.version === doc.version) {
      outcomes.push({
        key: doc.key,
        action: 'unchanged',
        from: existing.version,
        to: doc.version,
      });
      continue;
    }

    await prisma.cmsPage.update({
      where: { key: doc.key },
      data: {
        version: doc.version,
        titleEn: doc.titleEn,
        titleMr: doc.titleMr,
        bodyEn: doc.bodyEn as never,
        bodyMr: doc.bodyMr as never,
      },
    });
    outcomes.push({ key: doc.key, action: 'published', from: existing.version, to: doc.version });
  }

  return outcomes;
}

async function main(): Promise<void> {
  const prisma = createCliPrisma();
  await prisma.$connect();
  try {
    const outcomes = await publishPolicies(prisma);
    let refused = false;

    for (const o of outcomes) {
      if (o.action === 'published') {
        console.log(`${o.key}: published v${o.from ?? '—'} -> v${o.to}`);
      } else if (o.action === 'unchanged') {
        console.log(`${o.key}: already at v${o.to} — left alone (admin edits preserved)`);
      } else {
        refused = true;
        console.error(
          `${o.key}: REFUSED — database has v${o.from}, this image carries v${o.to}. ` +
            `The deployed image is behind the database; publishing would roll the policy back.`,
        );
      }
    }

    const published = outcomes.filter((o) => o.action === 'published').length;
    if (published > 0) {
      console.log(
        `\n${published} document(s) published. Every user whose recorded consent is now behind ` +
          `will be asked to accept again on their next visit.`,
      );
    }

    process.exitCode = refused ? 1 : 0;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
