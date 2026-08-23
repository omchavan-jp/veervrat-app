import { PrismaClient } from '@prisma/client';

/**
 * Deletes rows that have expired and serve no further purpose.
 *
 * Nothing removed these. Sessions were deleted only on an explicit logout, so with a 30-day TTL
 * every session anyone simply closed the tab on stayed forever — unbounded growth on the table
 * read by **every authenticated request** (#77). Verification tokens and pending signups have
 * the same shape and were equally unswept; leftover `pending_signups` rows are what made a
 * migration fail on UAT while passing locally against an empty table.
 *
 * **`invitations` is deliberately not here**, despite having `expires_at`. An expired invitation
 * is a business record someone can still see explained — `InvitationExpiredException` exists for
 * exactly that. Deleting those would change behaviour rather than reclaim garbage.
 *
 * Safe to run repeatedly and safe to run concurrently with live traffic: every row it touches is
 * already unusable. There is no confirmation guard for that reason — unlike `wipe-users.ts`,
 * this destroys nothing anyone can still use.
 */
export type CleanupCounts = {
  sessions: number;
  verificationTokens: number;
  pendingSignups: number;
};

export type CleanupPrisma = Pick<PrismaClient, 'session' | 'verificationToken' | 'pendingSignup'>;

export async function cleanupExpired(
  prisma: CleanupPrisma,
  now: Date = new Date(),
): Promise<CleanupCounts> {
  const expired = { expiresAt: { lt: now } };

  // Sequential rather than in a transaction: these are independent, none can leave the database
  // inconsistent halfway through, and a long transaction would hold locks on a hot table for no
  // benefit. If one fails the others have still done useful work.
  const sessions = await prisma.session.deleteMany({ where: expired });
  const verificationTokens = await prisma.verificationToken.deleteMany({ where: expired });
  const pendingSignups = await prisma.pendingSignup.deleteMany({ where: expired });

  return {
    sessions: sessions.count,
    verificationTokens: verificationTokens.count,
    pendingSignups: pendingSignups.count,
  };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const counts = await cleanupExpired(prisma);
    console.log('Cleanup complete:');
    console.log(`  sessions: ${counts.sessions}`);
    console.log(`  verification_tokens: ${counts.verificationTokens}`);
    console.log(`  pending_signups: ${counts.pendingSignups}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Only when executed directly, so importing this for tests does not open a database connection.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
