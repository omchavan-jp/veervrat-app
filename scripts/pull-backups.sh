#!/usr/bin/env bash
#
# Pull encrypted database dumps out of Azure to this machine.
#
# **This is the step that satisfies #131.** The nightly job writes to Blob, which is inside the
# same subscription as the database it protects — so it survives deletion, corruption and
# operator error, and not the loss of the subscription, which is the risk the whole change exists
# for. Nothing is backed up off-platform until this has run.
#
# Run it here, not in Azure: a Container Apps job cannot reach a laptop behind NAT with no stable
# address, so the transfer has to be initiated from the side that can see the other.
#
#   ./scripts/pull-backups.sh              # pull, verify, prune, report
#   ./scripts/pull-backups.sh --status     # report only, touch nothing
#
# Uses `az`, deliberately, rather than azcopy: `az` is already on this machine and the pull must
# work when things are going badly, which is the worst moment to be installing a tool.

set -Eeuo pipefail

DEST="${VEERVRAT_BACKUP_DIR:-$HOME/veervrat-backups}"
# One key per environment, because there IS one per environment — Terraform generates them
# separately and a prod dump will not open with the UAT key. A single shared path would have
# verified prod copies against the wrong key and deleted them as corrupt, which is a worse
# outcome than not checking at all.
KEY_DIR="${VEERVRAT_BACKUP_KEY_DIR:-$HOME/.secrets/veervrat}"
key_file_for() { echo "${KEY_DIR}/${1}-backup-encryption-key"; }
RETENTION_DAYS="${VEERVRAT_BACKUP_RETENTION_DAYS:-30}"
# Louder than the retention window on purpose: a pull that has not run for a week is a problem
# well before the oldest copy expires.
STALE_AFTER_HOURS="${VEERVRAT_BACKUP_STALE_HOURS:-48}"
ENVIRONMENTS="${VEERVRAT_BACKUP_ENVIRONMENTS:-uat prod}"

STATUS_ONLY=false
[ "${1:-}" = "--status" ] && STATUS_ONLY=true

die() { echo "FATAL: $*" >&2; exit 1; }
say() { echo "[pull] $*"; }

command -v az >/dev/null || die "az is not installed — see documentation/02_Local-Development-Setup.md"
az account show >/dev/null 2>&1 || die "not signed in to Azure — run: az login"

mkdir -p "$DEST"
MANIFEST="$DEST/manifest.json"
[ -f "$MANIFEST" ] || echo '{"copies":[]}' > "$MANIFEST"

# ── report ──────────────────────────────────────────────────────────────────────────────────
# Answers the question that matters — "is there a usable copy outside Azure, and how old is it?"
# — rather than "did the job run". A green job with nothing pulled is the failure this change
# exists to prevent, wearing the appearance of success.
report() {
  echo ""
  say "state of the off-Azure copies:"
  local now stale=0
  now=$(date -u +%s)
  for env in $ENVIRONMENTS; do
    local newest count
    # `set -o pipefail` plus a glob that matches nothing makes `ls | wc -l` fail the whole
    # pipeline and, under `set -e`, kill the script — silently reporting nothing, which is the
    # exact state this function exists to shout about. Enumerate with a glob instead.
    local -a found=()
    for f in "$DEST"/veervrat-"$env"-*.dump.enc; do [ -e "$f" ] && found+=("$f"); done
    count=${#found[@]}
    newest=""
    if [ "$count" -gt 0 ]; then
      newest=$(printf '%s\n' "${found[@]}" | sort | tail -1)
    fi
    if [ "$count" -eq 0 ]; then
      echo "  ${env}: NO COPY OUTSIDE AZURE"
      stale=1
      continue
    fi
    local stamp epoch age_h
    stamp=$(basename "$newest" | sed -n 's/.*-\([0-9]\{8\}T[0-9]\{6\}\)Z\.dump\.enc$/\1/p')
    # BSD date on macOS, GNU date elsewhere — this runs on a maintainer's laptop, which is
    # usually the former and must not depend on being either.
    epoch=$(date -u -j -f '%Y%m%dT%H%M%S' "$stamp" +%s 2>/dev/null \
            || date -u -d "${stamp:0:8} ${stamp:9:2}:${stamp:11:2}:${stamp:13:2}" +%s)
    age_h=$(( (now - epoch) / 3600 ))
    if [ "$age_h" -gt "$STALE_AFTER_HOURS" ]; then
      echo "  ${env}: ${count} copies, newest is ${age_h}h old — STALE (over ${STALE_AFTER_HOURS}h)"
      stale=1
    else
      echo "  ${env}: ${count} copies, newest is ${age_h}h old"
    fi
  done
  echo ""
  if [ "$stale" -eq 1 ]; then
    echo "  ⚠️  At least one environment has no recent copy outside Azure."
    echo "      That is the state #131 describes, not a warning about it."
    return 1
  fi
  say "every environment has a recent copy outside Azure."
}

if $STATUS_ONLY; then
  report
  exit $?
fi

for env in $ENVIRONMENTS; do
  kf=$(key_file_for "$env")
  [ -f "$kf" ] || die "no decryption key at ${kf} — a copy you cannot open is not a backup"
done

# ── pull ────────────────────────────────────────────────────────────────────────────────────
TOTAL_NEW=0
for env in $ENVIRONMENTS; do
  ACCOUNT="veervrat${env}backups"
  say "checking ${env} (${ACCOUNT})…"

  if ! az storage account show --name "$ACCOUNT" >/dev/null 2>&1; then
    say "  no such storage account — skipping (has the job been deployed to ${env}?)"
    continue
  fi

  BLOBS=$(az storage blob list --account-name "$ACCOUNT" --container-name database-dumps \
            --auth-mode login --query '[].name' -o tsv 2>/dev/null || true)
  [ -n "$BLOBS" ] || { say "  container is empty"; continue; }

  while read -r blob; do
    [ -n "$blob" ] || continue
    local_path="$DEST/$blob"
    [ -f "$local_path" ] && continue

    say "  pulling ${blob}…"
    az storage blob download --account-name "$ACCOUNT" --container-name database-dumps \
      --name "$blob" --file "$local_path" --auth-mode login --no-progress >/dev/null

    # Verify before it counts. A pulled file that will not decrypt is worse than no file: it
    # occupies the place a real answer would, and only fails when it is the last thing left.
    if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
           -in "$local_path" -pass "file:$(key_file_for "$env")" 2>/dev/null \
         | head -c 5 | grep -q PGDMP; then
      rm -f "$local_path"
      die "${blob} did not decrypt to a Postgres dump — removed it rather than keep an unopenable copy"
    fi

    size=$(wc -c < "$local_path" | tr -d ' ')
    sha=$(shasum -a 256 "$local_path" | cut -d' ' -f1)
    tmp=$(mktemp)
    # `--arg` rather than string interpolation: a filename is data, and building JSON by
    # concatenation is how a stray quote silently corrupts the record of what exists.
    jq --arg n "$blob" --arg e "$env" --arg s "$sha" --argjson b "$size" \
       --arg t "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.copies += [{name:$n, environment:$e, bytes:$b, sha256:$s, pulledAt:$t, verified:true}]' \
       "$MANIFEST" > "$tmp" && mv "$tmp" "$MANIFEST"

    TOTAL_NEW=$((TOTAL_NEW + 1))
    say "    verified, ${size} bytes"
  done <<< "$BLOBS"
done

say "pulled ${TOTAL_NEW} new copies"

# ── prune ───────────────────────────────────────────────────────────────────────────────────
# The half of retention the job cannot do. This pile is the one that grows unattended, on a
# machine nobody is monitoring, holding complete personal-data exports.
PRUNED=0
CUTOFF=$(date -u -v-"${RETENTION_DAYS}"d +%Y%m%d 2>/dev/null \
         || date -u -d "${RETENTION_DAYS} days ago" +%Y%m%d)
for f in "$DEST"/veervrat-*.dump.enc; do
  [ -e "$f" ] || continue
  d=$(basename "$f" | sed -n 's/.*-\([0-9]\{8\}\)T[0-9]\{6\}Z\.dump\.enc$/\1/p')
  [ -n "$d" ] || continue
  if [ "$d" -lt "$CUTOFF" ]; then
    rm -f "$f"
    tmp=$(mktemp)
    jq --arg n "$(basename "$f")" '.copies |= map(select(.name != $n))' "$MANIFEST" > "$tmp" \
      && mv "$tmp" "$MANIFEST"
    PRUNED=$((PRUNED + 1))
  fi
done
[ "$PRUNED" -gt 0 ] && say "pruned ${PRUNED} past ${RETENTION_DAYS} days"

report
