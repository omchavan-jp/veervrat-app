#!/usr/bin/env bash
# Refuse a manual terraform plan/apply against uat or prod while CD is mid-deploy on the same
# state file.
#
# CD's own deploy-environment action runs `terraform apply` as its first step. A manual command
# landing in that window collides on the Azure blob state lock: Terraform fails one side cleanly
# — nothing is corrupted, that part works — but a CD run then has to be diagnosed and rerun for
# a reason that has nothing to do with the change it was deploying. Happened 2026-08-24.
#
# FAILS OPEN. If `gh` is missing, unauthenticated, rate-limited or simply offline, this allows
# the command. A guard that bricks local infrastructure work whenever the network is unavailable
# would be a worse outage than the one it prevents, and would teach everyone to disable it.
set -uo pipefail

# Strip heredoc bodies before deciding whether this command runs Terraform.
#
# Both guards read the command TEXT, which cannot by itself tell an invocation from a mention. A
# `git commit -F-` whose message *describes* the tool — as the commit adding these very guards did
# — was refused as though it were an infrastructure command. Twice.
#
# Heredoc bodies are where prose lives, so removing them leaves the actual commands. Then require
# the invocation to begin a command (start of string, or after a newline, `;`, `&&`, `||`, `|`)
# rather than merely appear somewhere.
strip_heredocs() {
  awk '
    /<<-?[\047"]?[A-Za-z_][A-Za-z0-9_]*[\047"]?[[:space:]]*$/ && !inbody {
      match($0, /<<-?[\047"]?[A-Za-z_][A-Za-z0-9_]*/)
      tag = substr($0, RSTART, RLENGTH)
      gsub(/^<<-?[\047"]?/, "", tag)
      inbody = 1; marker = tag; print; next
    }
    inbody { if ($0 == marker) { inbody = 0 }; next }
    { print }
  '
}

INPUT="$(cat)"
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)"
[[ -z "$CMD" ]] && exit 0

EFFECTIVE="$(strip_heredocs <<<"$CMD")"
grep -Eq '(^|[;&|]|&&|\|\|)[[:space:]]*([A-Z_]+=[^[:space:]]+[[:space:]]+)*terraform[[:space:]]+(apply|plan)' <<<"$EFFECTIVE" || exit 0
grep -q 'VEERVRAT_ALLOW_TERRAFORM_DURING_CD=yes-i-am-sure' <<<"$CMD" && exit 0

# Which environment? Either named in the command (`cd .../envs/uat && terraform ...`) or already
# the shell's directory from an earlier call, since the Bash tool's cwd persists between them.
TARGET=""
grep -q 'envs/prod' <<<"$CMD" && TARGET="prod"
grep -q 'envs/uat' <<<"$CMD" && TARGET="uat"
if [[ -z "$TARGET" ]]; then
  case "$PWD" in
    */infra/terraform/envs/prod*) TARGET="prod" ;;
    */infra/terraform/envs/uat*)  TARGET="uat" ;;
  esac
fi
# envs/shared has its own state file, so CD's uat/prod applies cannot collide with it.
[[ -z "$TARGET" ]] && exit 0

command -v gh >/dev/null 2>&1 || exit 0

ACTIVE="$(gh run list --workflow=cd.yml --limit 10 \
            --json status,headBranch,databaseId,displayTitle 2>/dev/null \
          | jq -r '[.[] | select(.status == "in_progress" or .status == "queued")] | .[0] // empty' 2>/dev/null)"
[[ -z "$ACTIVE" ]] && exit 0   # no active run, or the query failed — either way, allow

RUN_ID="$(jq -r '.databaseId // "unknown"' <<<"$ACTIVE")"
RUN_TITLE="$(jq -r '.displayTitle // "unknown"' <<<"$ACTIVE")"
RUN_BRANCH="$(jq -r '.headBranch // "unknown"' <<<"$ACTIVE")"

jq -n --arg cmd "$CMD" --arg target "$TARGET" --arg id "$RUN_ID" \
      --arg title "$RUN_TITLE" --arg branch "$RUN_BRANCH" '
{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: (
      "Refusing: a CD run is active and applies Terraform to the same state file this command " +
      "would lock.\n\n" +
      "Blocked command:\n  \($cmd)\n\n" +
      "Active run:\n  #\($id) on \($branch) — \($title)\n\n" +
      "Both sides want the lock on envs/\($target)'"'"'s state blob. Terraform fails one of them " +
      "cleanly, so nothing is corrupted — but the CD run is the one that usually loses, and then " +
      "has to be diagnosed and rerun for a reason unrelated to what it was deploying. That " +
      "happened on 2026-08-24.\n\n" +
      "Wait for it:\n" +
      "  gh run watch \($id)\n\n" +
      "Or let CD do the apply — merging is the normal path for anything CD already applies.\n\n" +
      "Real override, if this genuinely is not the same state file:\n" +
      "  VEERVRAT_ALLOW_TERRAFORM_DURING_CD=yes-i-am-sure <your command>"
    )
  }
}'
