## Why

There is no copy of the data outside Azure (#131).

Azure Postgres keeps managed backups — 35 days on prod, 7 on UAT — but they live in the same
subscription and the same region as the database they protect, and geo-redundancy is off in both
environments. They cover deletion, corruption and operator error. They do not cover **losing the
subscription**, because they are inside the thing you lost.

That is not a hypothetical filed for completeness. The grant expires 2027-08-14 (#93, O14), it
bills a personal card, and a provider can suspend an account for reasons unrelated to payment —
which is the risk the whole portability workstream exists to answer. Meanwhile GitHub Actions
billing already failed once mid-session and forced an unplanned repository transfer
(`infra-budget-log.md`, 2026-08-24), so "the provider stops cooperating" is a thing that has
happened here, not a thing imagined about elsewhere.

The only artifact outside Azure today is `backups/veervrat-neon-20260809T184831Z.dump` — 249 KB,
pre-Azure, historical, and on one laptop by accident rather than by design.

## What Changes

- A **scheduled Container Apps job** dumps the database, encrypts the dump, and writes it to
  Azure Blob in the same region. The job pattern is established: `cleanup-expired-job.tf` already
  runs on cron with a Key Vault secret injected through a user-assigned identity.
- A **pull from outside Azure** retrieves those dumps to a machine that is not Azure, and keeps a
  manifest of which dump exists in which location. Initially that machine is a maintainer laptop
  running S3-compatible local storage.
- **Retention** with a number, and deletion of dumps past it, in both locations.
- A **restore rehearsal** — performed, then written down. An export nobody has restored from is a
  file, not a backup.

### Why the transfer is a pull and not a push

A Container Apps job cannot reach a laptop: no stable address, behind NAT. The transfer has to be
initiated from the side that can see the other. So the Blob copy is **staging**, and the copy that
satisfies this change is the one that has been pulled out.

### Why not a third-party object store

`documentation/22_Platform-Requirements.md` §8 states that application data, **including
backups**, must remain in India, and calls it a legal requirement rather than a preference.
#131's recommended option names Cloudflare R2 and Backblaze B2; neither is stated to offer an
India region, and the two documents do not reference each other, so the conflict reads as
unnoticed rather than resolved.

Pulling to a machine already in India satisfies the requirement without introducing a processor
at all — nothing to add to `ops/data-map.md` or to the privacy policy, and nothing to negotiate.

The existing Sentry exception does not extend to cover a dump. Sentry was made acceptable by
sending almost nothing personal — 5xx message and stack trace, `sendDefaultPii: false`, a
`beforeSend` scrubber. A `pg_dump` is the opposite of a narrow extract.

## What this deliberately is not

**It is an interim, and it says so.** One laptop is a single point of failure: lost, stolen or
dead and the off-site copy is gone with it. This is strictly better than zero copies outside
Azure and worse than a real second location. The trigger for replacing it is go-live, and that
trigger is recorded in the change rather than left to memory.

The destination is configuration, not architecture. Replacing the laptop with a hosted store in
India later is a variable and a credential, not a redesign.

## Capabilities

### New Capabilities
- `offsite-backup`: a copy of the database exists outside the Azure subscription, on a schedule,
  encrypted, with a stated retention and a rehearsed restore.
