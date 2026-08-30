#!/usr/bin/env bash
#
# Dump the database, encrypt it, put it in Blob, and delete what is past retention.
#
# ⚠️ What this produces is NOT the off-site copy. Blob is in the same subscription as the database
# it protects. The copy that satisfies #131 is the one pulled out of here to a machine that is not
# Azure — see openspec/changes/offsite-backup/design.md §1. A green run of this job is not
# evidence that a backup exists anywhere useful.
#
# Fails loudly and early, on purpose. A dump job that exits 0 having written nothing is the worst
# outcome available, because it looks exactly like the good one.

set -Eeuo pipefail

fail() {
  echo "FATAL: $*" >&2
  exit 1
}
trap 'fail "aborted at line $LINENO"' ERR

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
: "${BACKUP_STORAGE_ACCOUNT:?BACKUP_STORAGE_ACCOUNT is required}"
: "${BACKUP_CONTAINER:?BACKUP_CONTAINER is required}"
: "${ENVIRONMENT:?ENVIRONMENT is required}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:?BACKUP_RETENTION_DAYS is required}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="veervrat-${ENVIRONMENT}-${STAMP}.dump.enc"
PLAIN="/tmp/dump.bin"
CIPHER="/tmp/${NAME}"
ENDPOINT="https://${BACKUP_STORAGE_ACCOUNT}.blob.core.windows.net/${BACKUP_CONTAINER}"

cleanup() { rm -f "$PLAIN" "$CIPHER"; }
trap cleanup EXIT

echo "[backup] ${ENVIRONMENT} ${STAMP}"

# ── dump ────────────────────────────────────────────────────────────────────────────────────
# Custom format (-Fc): compressed, and restorable selectively with pg_restore, which matters when
# the restore is being done under pressure and you want one table rather than the world.
echo "[backup] pg_dump…"
pg_dump --format=custom --no-owner --no-privileges --file="$PLAIN" "$DATABASE_URL"

[ -s "$PLAIN" ] || fail "pg_dump produced an empty file"
PLAIN_BYTES=$(stat -c%s "$PLAIN")

# A dump of a live database is never a few hundred bytes. This catches the case pg_dump cannot:
# a connection that succeeded against the wrong, or an empty, database — which is precisely how
# prod ran for four days on a schema-less database while /health returned 200 (#112).
[ "$PLAIN_BYTES" -ge 1024 ] || fail "dump is only ${PLAIN_BYTES} bytes — refusing to treat that as a backup"
echo "[backup] dumped ${PLAIN_BYTES} bytes"

# ── encrypt ─────────────────────────────────────────────────────────────────────────────────
# Before it leaves this process, so nothing readable is ever written to storage.
#
# `openssl enc` rather than age or gpg, chosen for the restore rather than the backup: openssl is
# present on essentially every machine, so decrypting needs no install at the moment somebody is
# already having a bad day. The exact counterpart command is in DEPLOYMENT.md.
echo "[backup] encrypting…"
printf '%s' "$BACKUP_ENCRYPTION_KEY" \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -in "$PLAIN" -out "$CIPHER" -pass stdin

[ -s "$CIPHER" ] || fail "encryption produced an empty file"

# Prove it round-trips before this dump is treated as one. An unopenable backup is worse than a
# missing one: it occupies the place where a real answer would be, and only fails when it is the
# only thing left.
printf '%s' "$BACKUP_ENCRYPTION_KEY" \
  | openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in "$CIPHER" -pass stdin \
  | head -c 5 | grep -q 'PGDMP' \
  || fail "encrypted dump did not decrypt back to a Postgres dump — refusing to upload it"
echo "[backup] verified it decrypts to a Postgres dump"

# ── upload ──────────────────────────────────────────────────────────────────────────────────
echo "[backup] uploading…"
azcopy login --login-type=MSI --identity-client-id "${AZURE_CLIENT_ID:?AZURE_CLIENT_ID is required}" >/dev/null
azcopy copy "$CIPHER" "${ENDPOINT}/${NAME}" --from-to=LocalBlob --overwrite=false

# azcopy reports success for a transfer of zero files, so ask the destination rather than trust
# the exit code — the same class of green-signal-without-evidence that conventions §21 is about.
azcopy list "$ENDPOINT" --output-type=text | grep -q "$NAME" \
  || fail "upload reported success but ${NAME} is not in the container"
echo "[backup] uploaded ${NAME}"

# ── retention ───────────────────────────────────────────────────────────────────────────────
# Part of the job, not a chore somebody remembers. An unbounded pile of complete personal-data
# exports is a liability that grows on its own, and the privacy policy has to be able to say how
# long they are kept.
echo "[backup] pruning older than ${RETENTION_DAYS} days…"
CUTOFF=$(date -u -d "${RETENTION_DAYS} days ago" +%Y%m%d)
PRUNED=0
while read -r blob; do
  [ -n "$blob" ] || continue
  # veervrat-<env>-YYYYMMDDTHHMMSSZ.dump.enc
  blob_date=$(printf '%s' "$blob" | sed -n 's/.*-\([0-9]\{8\}\)T[0-9]\{6\}Z\.dump\.enc$/\1/p')
  [ -n "$blob_date" ] || continue
  if [ "$blob_date" -lt "$CUTOFF" ]; then
    azcopy remove "${ENDPOINT}/${blob}" --from-to=BlobTrash
    echo "[backup]   removed ${blob}"
    PRUNED=$((PRUNED + 1))
  fi
done < <(azcopy list "$ENDPOINT" --output-type=text | sed -n 's/^INFO: \(veervrat-[^;]*\.dump\.enc\);.*/\1/p')

echo "[backup] done — uploaded ${NAME}, pruned ${PRUNED}"
echo "[backup] REMINDER: this is staging. #131 is satisfied only once this is pulled out of Azure."
