# Design — off-site backup

## 1. The copy that counts is the one outside Azure

The scheduled job writes to Azure Blob. That is **staging**, and on its own it changes nothing
about the risk this addresses: Blob is in the same subscription as the database.

The change is met only when a dump has been pulled to a machine that is not Azure. So the
manifest, and any check on whether backups are working, must count **pulled** copies. A green job
that has written twenty dumps to Blob while nothing has pulled for a month is the failure this
change exists to prevent, wearing the appearance of success.

## 2. Encryption, and where the key cannot be

The dump is every adult personal record the platform holds, in plain form. It is encrypted before
it leaves the job.

The key **cannot live only in Key Vault**. If the lost thing is the subscription, Key Vault went
with it, and the surviving dumps are ciphertext nobody can open — a backup that fails in exactly
the scenario it was built for. So the key exists in Key Vault *and* somewhere outside Azure, and
the restore procedure names both.

This is the one part of the design where getting it wrong is invisible until the day it matters.

**Decided 2026-08-30 — two copies, doing different jobs.**

*Bitwarden* holds the copy that survives: off the laptop, off Azure, and shared with a second
maintainer. Chosen over 1Password because `21_Infrastructure-Conventions.md` §24 asks for a named
replacement before adopting a provider, and Bitwarden has one — Vaultwarden runs the same clients
against our own server. 1Password has no exit. KeePassXC has no dependency at all, which is
purer, but sharing means passing a file by hand, and that reintroduces exactly the single-holder
problem the second copy exists to remove. The free tier covers this: a personal vault plus a
two-person organisation.

*`~/.secrets/veervrat/`* (mode 600, the pattern already used for SMTP and OAuth credentials)
holds the working copy. **It is a convenience, not a surviving copy** — the dumps land on that
same laptop, so alone it fails the only test that matters: one theft yields both the ciphertext
and the key.

⚠️ The rehearsal must not read the local copy. See task 5.2: restoring with only what survives
losing the subscription is the whole assertion, and a rehearsal that quietly reaches for
`~/.secrets/` proves the opposite of what it claims.

**Residency, flagged rather than assumed.** Bitwarden hosts in the US or EU. §8 governs
*application data*; an encryption key is not user data, and the vault is end-to-end encrypted so
the server never holds plaintext. That reasoning looks sound and it is not mine to ratify — the
Sentry exception had to be argued explicitly, and this should be too if anyone disagrees.

## 3. Retention needs a number

An unbounded pile of full personal-data exports is a liability that grows on its own, and "we
keep backups" is a sentence the privacy policy has to be able to make true.

**Proposed: 30 days, both locations.** It exceeds UAT's 7-day managed window, sits under prod's
35, and is short enough that the pile stays small at this data size. Deletion is part of the job,
not a separate chore — anything that depends on somebody remembering will eventually not happen.

## 4. The 18+ point, since #131 says otherwise

`MINIMUM_AGE_YEARS = 18`, enforced at signup on both paths and re-checked after the Google round
trip. The dump contains **no data about minors**, contrary to #131's body. It contains adult
personal data, which is enough to justify encryption and retention on its own without overstating
what is at stake.

## 5. Rehearsal is part of the change, not follow-up

`DEPLOYMENT.md` documents the point-in-time restore procedure **because somebody performed it**.
Restoring from a logical dump is a different procedure and inherits none of that confidence.

The rehearsal restores a real dump into a scratch database and checks that the data is there —
and it is written down afterwards, so the record describes what happened rather than what was
intended. Until that is done, this change has produced files, not backups.

## 6. Open, and deliberately so

**Where the pull runs.** Initially a maintainer laptop. It is a single point of failure and the
proposal says so. Replacing it with a hosted store in India is a variable and a credential.

**What watches the watcher.** If the laptop is off for a fortnight, nothing currently notices. The
manifest makes that answerable; deciding what raises the alarm, and to whom, is left to the
implementation rather than guessed at here.
