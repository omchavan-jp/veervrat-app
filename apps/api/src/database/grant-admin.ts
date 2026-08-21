// Grants the ADMIN role to one account, identified by email, so an environment has a first
// administrator. Run as a one-off Container Apps job — see DEPLOYMENT.md and
// documentation/21_Infrastructure-Conventions.md §22.
//
// Why this exists: the admin dashboard is deployed but unreachable. Signup assigns VRATARTHI,
// the seed creates no users, and the only way to change roles is an endpoint that already
// requires ADMIN. Without this, every environment has a fully built administrative surface
// that nobody can open, in principle rather than by accident.
//
// Why a standalone script using PrismaClient directly, when AGENTS.md says "no Prisma outside
// repository files": that rule governs the Nest application layers, where a stray query bypasses
// the repository boundary. Standalone database scripts are an established exception — seed.ts
// has done the same since the project began. Booting the whole Nest container (config
// validation, Redis, every module) to write one row would be the worse trade.

import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AUDIT_ACTION = 'admin.role.bootstrap_granted';

type Deps = {
  email: string;
  allowUnverified: boolean;
};

export function readConfig(env: NodeJS.ProcessEnv = process.env): Deps {
  return {
    email: (env.BOOTSTRAP_ADMIN_EMAIL ?? '').trim(),
    allowUnverified: (env.BOOTSTRAP_ADMIN_ALLOW_UNVERIFIED ?? '').toLowerCase() === 'true',
  };
}

/**
 * Returns an exit code rather than calling process.exit, so it is testable.
 *
 * 0 = nothing needed to change (no email configured, or already an admin)
 * 1 = the operator asked for something that did not happen
 */
export async function grantAdmin(
  prisma: Pick<PrismaClient, 'user' | 'userRole' | 'auditEvent'>,
  deps: Deps,
): Promise<number> {
  if (!deps.email) {
    console.log('BOOTSTRAP_ADMIN_EMAIL is not set — nothing to do.');
    return 0;
  }

  const user = await prisma.user.findUnique({
    where: { email: deps.email },
    select: {
      id: true,
      email: true,
      username: true,
      emailVerifiedAt: true,
      roles: { select: { role: true } },
    },
  });

  // A hard failure, deliberately. Bootstrapping is an explicit act; exiting 0 because an email
  // was mistyped would report success without acting — the exact failure this job's whole
  // design guards against (see #112, where a migration did that three times).
  if (!user) {
    console.error(`No user with email ${deps.email}.`);
    console.error('That account must sign up in this environment before it can be granted ADMIN.');
    return 1;
  }

  const roles = user.roles.map((r) => r.role);

  if (roles.includes(Role.ADMIN)) {
    // No audit row on a no-op. A log that fills with "granted admin" for grants that never
    // happened is worse than no log.
    console.log(`${user.email} is already an admin — no change. roles: [${roles.join(', ')}]`);
    return 0;
  }

  // Admin is effectively superadmin: any admin can add or remove ADMIN on anyone. Handing that
  // to an address nobody has proven they own is not a risk worth taking by default. The opt-out
  // exists because the recovery case — no admins left, mail relay down — is exactly when this
  // job matters most, and a guard with no escape hatch would lock the door it exists to open.
  if (!user.emailVerifiedAt && !deps.allowUnverified) {
    console.error(`${user.email} has not verified their email address.`);
    console.error('Refusing to grant ADMIN. Verify the address, or set');
    console.error('BOOTSTRAP_ADMIN_ALLOW_UNVERIFIED=true to override deliberately.');
    return 1;
  }

  console.log(`granting ADMIN to ${user.email} (${user.id})`);

  // Additive. Replacing `roles` would strip VRATARTHI and cost the operator their own practice
  // data's role context.
  await prisma.userRole.create({ data: { userId: user.id, role: Role.ADMIN } });

  // Awaited, unlike AuditService.record() which is fire-and-forget by design so an audit failure
  // never fails a user's request. That guarantee is backwards here: a job that grants ADMIN and
  // fails to record it has done the most privileged thing in the system invisibly. Here the
  // record beats convenience, so a failed write fails the job.
  await prisma.auditEvent.create({
    data: {
      actorId: null, // no human actor — this runs as infrastructure
      action: AUDIT_ACTION,
      resourceType: 'user',
      resourceId: user.id,
      metadata: {
        email: user.email,
        username: user.username,
        rolesBefore: roles,
        rolesAfter: [...roles, Role.ADMIN],
        emailVerified: user.emailVerifiedAt !== null,
        grantedVia: 'bootstrap-admin-job',
      },
    },
  });

  console.log(`roles: [${roles.join(', ')}] -> [${[...roles, Role.ADMIN].join(', ')}]`);
  console.log(`audit event recorded: ${AUDIT_ACTION}`);
  return 0;
}

async function main(): Promise<void> {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();
  try {
    process.exitCode = await grantAdmin(prisma, readConfig());
  } finally {
    await prisma.$disconnect();
  }
}

// Only run when invoked directly, so the tests can import grantAdmin without connecting.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
