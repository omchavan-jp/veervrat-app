## 0. Read first

- [ ] 0.1 `#131` in full, including the comment correcting two claims in its body: the dump
  contains no data about minors (the platform is strictly 18+), and its recommended option
  conflicts with the residency requirement in `documentation/22_Platform-Requirements.md` §8.
- [ ] 0.2 `infra/terraform/modules/environment/cleanup-expired-job.tf` — the established
  scheduled-job pattern. Cron in UTC, Key Vault secret by user-assigned identity, retry limit,
  and the comment explaining why 20:30 UTC was chosen for this audience.

## 1. The dump job

- [ ] 1.1 A job that runs `pg_dump` against the environment's database and writes an encrypted
  artifact to Blob. Encryption happens **before** the artifact leaves the job.
- [ ] 1.2 Schedule it. Follow the existing convention of choosing the hour in IST and writing the
  UTC cron with the conversion stated, rather than leaving a bare number.
- [ ] 1.3 Fail loudly. A dump job that exits zero having written nothing is the worst outcome
  available, because it looks like the good one.

## 2. The key

- [ ] 2.1 Generate and store the encryption key in Key Vault.
- [ ] 2.2 **And outside Azure.** If the subscription is what was lost, a key that lives only in
  Key Vault makes every surviving dump unopenable.
  Decided 2026-08-30: **Bitwarden**, shared with a second maintainer, plus a working copy in
  `~/.secrets/veervrat/` (mode 600). The second holder is the point — a key only one person can
  produce is the bus-factor problem #137 is about, and a backup only one person can decrypt is
  not a backup for the organisation. Reasoning in `design.md` §2.
  ⚠️ Record *where* the copies are. Never the key itself, anywhere in this repository.

## 3. The pull

- [ ] 3.1 A pull that runs outside Azure and retrieves dumps to local S3-compatible storage.
- [ ] 3.2 A manifest: which dump exists in which location, and when it was last confirmed there.
  It must distinguish "written to Blob" from "pulled out", because only the second one satisfies
  this change.
- [ ] 3.3 Decide what notices when no pull has succeeded for too long, and who it tells.

## 4. Retention

- [ ] 4.1 Delete dumps older than the retention window, in **both** locations. Part of the job,
  not a chore.
- [ ] 4.2 Record the number and its reasoning in `ops/data-map.md`, since it is an answer the
  privacy policy will have to give.

## 5. Verify like a person

- [ ] 5.1 **Restore a real dump into a scratch database and confirm the data is there.** Not the
  job's exit code — the restored rows.
- [ ] 5.2 Restore using **only** what would survive losing the subscription: the pulled dump and
  the off-Azure key copy. If the rehearsal quietly reaches for Key Vault, it has proven the
  wrong thing.
- [ ] 5.3 Write the procedure down afterwards, describing what was done rather than what was
  planned — the standard `DEPLOYMENT.md` already sets for the point-in-time restore.

## 6. Records

- [ ] 6.1 `ops/data-map.md` — a new location holding personal data, with its retention.
- [ ] 6.2 Note in the change and in `#131` that this is an **interim**: one device, single point
  of failure, to be revisited before go-live.

## 7. Carried forward, not done here

- [ ] 7.1 Replacing the laptop with a hosted store in India. The destination is a variable; this
  is a procurement and residency-verification question, not a code change.
- [ ] 7.2 Object storage (`veervratuatuploads`, `veervratproduploads`) is **not** covered by this
  change — it dumps the database only. Uploaded files have their own copy problem, and pretending
  otherwise in the data map would be worse than leaving it stated.
