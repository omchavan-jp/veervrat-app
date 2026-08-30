#!/usr/bin/env bash
# Refuse a terraform apply against uat or prod that would delete the whole application because the
# variables only CD supplies are absent.
#
# `modules/environment/container-apps.tf`:
#
#     deploy = var.deploy_apps && var.image_tag != ""
#
# `deploy_apps` defaults to false and `image_tag` to "", and only CD ever passes them (cd.yml →
# deploy-environment). So from a laptop every `count` on those resources evaluates to 0, and
# Terraform faithfully proposes to destroy `api`, `web` and all seven jobs:
#
#     Plan: 1 to add, 1 to change, 10 to destroy.
#
# The database survives — `lifecycle.prevent_destroy` — so this is not data loss. It is the entire
# serving layer, including the migration job needed to rebuild it.
#
# ⚠️ THE COMMAND LOOKS CORRECT. There is no typo and no wrong flag: `terraform apply` is exactly
# what somebody rotating a secret would type. `CLAUDE.md` already carries the rule that catches it
# — read the plan summary, a non-zero destroy count means stop — and that rule DID catch it on
# 2026-08-30. But the comment in container-apps.tf records a near-identical mistake having already
# been made once, so the rule alone has a track record of not being enough. Hence a mechanism.
#
# WHY ONLY `apply`. `plan` is how you discover this; blocking it would remove the tool that finds
# the problem. Only the irreversible half is refused.
#
# FAILS CLOSED, unlike guard-terraform-during-cd.sh, and deliberately. That guard fails open
# because a network outage should not block infrastructure work. This one needs no network — it
# reads the command — so there is no outage to accommodate, and the cost of being wrong is
# production.
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
grep -Eq '(^|[;&|]|&&|\|\|)[[:space:]]*([A-Z_]+=[^[:space:]]+[[:space:]]+)*terraform[[:space:]]+apply' <<<"$EFFECTIVE" || exit 0
grep -q 'VEERVRAT_ALLOW_APP_DESTROY=yes-i-have-read-the-plan' <<<"$CMD" && exit 0

# Which environment? Named in the command, or already the shell's cwd — the Bash tool's directory
# persists between calls, so `cd .../envs/prod` then `terraform apply` arrives as two commands.
TARGET=""
grep -q 'envs/prod' <<<"$CMD" && TARGET="prod"
grep -q 'envs/uat'  <<<"$CMD" && TARGET="uat"
if [[ -z "$TARGET" ]]; then
  case "$PWD" in
    */infra/terraform/envs/prod*) TARGET="prod" ;;
    */infra/terraform/envs/uat*)  TARGET="uat"  ;;
  esac
fi
# envs/shared holds no container apps, so this failure mode does not exist there.
[[ -z "$TARGET" ]] && exit 0

# Two forms are safe, and they are the only two.
#
#   -target=...     Terraform evaluates only what is named and its dependencies, so the
#                   conditional resources are never considered. This is the secret-rotation shape.
#   -var image_tag= Reconstructs what CD passes, so `deploy` evaluates true and the apps are left
#                   alone. This is the shape for genuinely changing infrastructure by hand.
grep -q -- '-target' <<<"$CMD" && exit 0
grep -Eq -- '-var[= ]+.?image_tag' <<<"$CMD" && exit 0
grep -q -- '-var-file' <<<"$CMD" && exit 0

jq -n --arg cmd "$CMD" --arg target "$TARGET" '
{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: (
      "Refusing: this would destroy every Container App and job in \($target).\n\n" +
      "Blocked command:\n  \($cmd)\n\n" +
      "Why. `container-apps.tf` gates the apps and jobs on:\n\n" +
      "    deploy = var.deploy_apps && var.image_tag != \"\"\n\n" +
      "`deploy_apps` defaults to false and `image_tag` to \"\", and ONLY CD passes them. From a " +
      "laptop the conditional is false, every count is 0, and Terraform concludes api, web and " +
      "all seven jobs should not exist:\n\n" +
      "    Plan: 1 to add, 1 to change, 10 to destroy.\n\n" +
      "The database survives (prevent_destroy). The serving layer does not — including the " +
      "migration job you would need to rebuild it. Tracked as #275.\n\n" +
      "Rotating a secret? Use -target so nothing else is evaluated:\n" +
      "  terraform apply \\\\\n" +
      "    -replace=<resource> \\\\\n" +
      "    -target=<resource> \\\\\n" +
      "    -target=<the key vault secret that reads it>\n" +
      "  Expect: 1 to add, 1 to change, 1 to destroy.\n\n" +
      "Genuinely changing infrastructure? Reconstruct what CD passes:\n" +
      "  terraform apply -var deploy_apps=true -var image_tag=<sha currently deployed>\n\n" +
      "Or let CD do it — merging is the normal path for anything CD already applies.\n\n" +
      "Override, only after reading a plan and seeing a destroy count you actually intend:\n" +
      "  VEERVRAT_ALLOW_APP_DESTROY=yes-i-have-read-the-plan <your command>"
    )
  }
}'
