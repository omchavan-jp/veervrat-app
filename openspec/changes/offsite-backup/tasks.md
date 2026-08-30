## 0. Read first

- [x] 0.1 `#131` in full, including the comment correcting two claims in its body: the dump
  contains no data about minors (the platform is strictly 18+), and its recommended option
  conflicts with the residency requirement in `documentation/22_Platform-Requirements.md` §8.
  Done 2026-08-29 — both corrections were found by reading it against the code and the
  requirements doc, and posted as a comment on the issue before any of this was designed.
- [x] 0.2 `infra/terraform/modules/environment/cleanup-expired-job.tf` — the established
  scheduled-job pattern. Cron in UTC, Key Vault secret by user-assigned identity, retry limit,
  and the comment explaining why 20:30 UTC was chosen for this audience.
  Done 2026-08-30. The backup job follows it: same identity and registry blocks, same secret
  wiring, retry limit 1 for the same reason, and 21:30 UTC chosen as 03:00 IST — an hour after
  the sweep, so the dump is taken after expired rows are gone rather than capturing them.

## 1. The dump job

- [x] 1.1 A job that runs `pg_dump` against the environment's database and writes an encrypted
  artifact to Blob. Encryption happens **before** the artifact leaves the job.
  Done 2026-08-30. Its own image (`apps/backup/`), because pg_dump refuses to dump a server newer
  than itself and Debian ships client 15 against a server on 18 — and because the migrate image
  is on the critical deploy path and not worth risking for this.
- [x] 1.2 Schedule it. Follow the existing convention of choosing the hour in IST and writing the
  UTC cron with the conversion stated, rather than leaving a bare number.
  Done 2026-08-30: `30 21 * * *` UTC, which is 03:00 IST — an hour after cleanup-expired, so the
  dump is taken after the nightly sweep rather than capturing rows about to disappear.
- [x] 1.3 Fail loudly. A dump job that exits zero having written nothing is the worst outcome
  available, because it looks like the good one.
  Done 2026-08-30. Refuses an empty dump, a dump under 1KB, an upload azcopy calls successful but
  which is absent from the container, and — before uploading — a file that does not decrypt back
  to a Postgres dump. The 1KB floor is not theoretical: a first test run had pg_dump fail, write
  0 bytes, and openssl cheerfully encrypt the empty file into 32 bytes.

## 2. The key

- [x] 2.1 Generate and store the encryption key in Key Vault.
  Done 2026-08-30: `random_password` into `backup-encryption-key`, the same generate-and-vault
  pattern as the Postgres admin password — never written to a file.
- [ ] 2.2 **And outside Azure.** If the subscription is what was lost, a key that lives only in
  Key Vault makes every surviving dump unopenable.
  Decided 2026-08-30: **Bitwarden**, shared with a second maintainer, plus a working copy in
  `~/.secrets/veervrat/` (mode 600). The second holder is the point — a key only one person can
  produce is the bus-factor problem #137 is about, and a backup only one person can decrypt is
  not a backup for the organisation. Reasoning in `design.md` §2.
  ⚠️ Record *where* the copies are. Never the key itself, anywhere in this repository.

## 3. The pull

- [x] 3.1 A pull that runs outside Azure and retrieves dumps to local S3-compatible storage.
  Done 2026-08-30: `scripts/pull-backups.sh`.

  ⚠️ **A plain directory, not S3-compatible storage** — a deliberate departure from the proposal's
  wording, recorded rather than made quietly. MinIO would add a service that has to be running for
  the copy to be reachable, and this copy exists precisely for the times when things are not
  running. Nothing consumes an S3 API here; the files are read by `openssl` and `pg_restore`. The
  destination is `VEERVRAT_BACKUP_DIR`, so pointing it at a MinIO mount later is configuration.

  Uses `az`, not azcopy: `az` is already on the machine, and a pull needed during an incident is
  the worst moment to be installing a tool.
- [x] 3.2 A manifest: which dump exists in which location, and when it was last confirmed there.
  It must distinguish "written to Blob" from "pulled out", because only the second one satisfies
  this change.
  Done 2026-08-30: `manifest.json` beside the copies, recording name, environment, size, sha256,
  when it was pulled, and that it was verified.

  The distinction is structural rather than a field: **the manifest only ever records a pulled
  copy**, and each entry is written after that file has been decrypted back to a Postgres dump.
  A blob sitting in Azure has no entry, so it cannot be mistaken for one that is safe.
- [x] 3.2b Schedule the pull so it survives the machine being off.
  Done 2026-08-30: `scripts/install-backup-pull-agent.sh`, a launchd agent on `StartInterval`.
  Not cron — on macOS cron silently skips a run whose time passed while asleep and never catches
  up, so a laptop closed overnight would take no backup while appearing scheduled.
  The pull itself needs no catch-up logic: it fetches whatever is in Azure and not here, so five
  missed days are five dumps on the next run.

- [x] 3.3 Decide what notices when no pull has succeeded for too long, and who it tells.
  Decided 2026-08-30, and deliberately smaller than the task implies.

  **What notices:** `./scripts/pull-backups.sh --status` answers "is there a usable copy outside
  Azure, and how old is it" and **exits non-zero** when any environment has none or is older than
  48 hours. Non-zero rather than a printed warning, so it can be the condition of a cron line or
  a shell prompt without anyone parsing text. 48h is louder than the 30-day retention on purpose:
  a pull that has not run for a week is a problem long before the oldest copy expires.

  **Who it tells: nobody yet, and that is the honest state.** Alerting needs somewhere to send to,
  and email is the only channel this platform has — routing a backup alarm through the same SMTP
  relay whose failure would be one of the things worth alarming about is a poor design. Left to
  #143 (incident response), which is where the question of what pages whom belongs. Recording it
  here rather than inventing a destination is the point of this task.

## 4. Retention

- [x] 4.1 Delete dumps older than the retention window, in **both** locations. Part of the job,
  not a chore.
  Blob half done 2026-08-30 — 30 days, pruned by the same job that writes. ⚠️ The pulled copies
  are **not** yet pruned; that belongs with the pull (task 3) and this task is not finished until
  it is, because the off-Azure pile is the one that grows unattended.
- [x] 4.2 Record the number and its reasoning in `ops/data-map.md`, since it is an answer the
  privacy policy will have to give.
  Done 2026-08-30. §3 previously opened "there is no retention policy" flatly; it now names this
  as the one exception, with the number and why it is that number.

## 5. Verify like a person

- [ ] 5.1 **Restore a real dump into a scratch database and confirm the data is there.** Not the
  job's exit code — the restored rows.
- [ ] 5.2 Restore using **only** what would survive losing the subscription: the pulled dump and
  the off-Azure key copy. If the rehearsal quietly reaches for Key Vault, it has proven the
  wrong thing.
- [ ] 5.3 Write the procedure down afterwards, describing what was done rather than what was
  planned — the standard `DEPLOYMENT.md` already sets for the point-in-time restore.

## 6. Records

- [x] 6.1 `ops/data-map.md` — a new location holding personal data, with its retention.
  Done 2026-08-30. Listed as two places rather than one, because the distinction is the whole
  change: Blob is staging inside the same subscription, and only the pulled copy satisfies #131.
  A single row would have implied the first was enough.
- [ ] 6.2 Note in the change and in `#131` that this is an **interim**: one device, single point
  of failure, to be revisited before go-live.
  ⚠️ Half done: `proposal.md` says it, `#131` does not yet. Left open until the issue says so too
  — the proposal is read by whoever works on this, and #131 is read by whoever wonders whether it
  is handled.

## 7. Carried forward, not done here

- [ ] 7.1 Replacing the laptop with a hosted store in India. The destination is a variable; this
  is a procurement and residency-verification question, not a code change.
- [ ] 7.2 Object storage (`veervratuatuploads`, `veervratproduploads`) is **not** covered by this
  change — it dumps the database only. Uploaded files have their own copy problem, and pretending
  otherwise in the data map would be worse than leaving it stated.
