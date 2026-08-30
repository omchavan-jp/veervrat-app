#!/usr/bin/env bash
# Cases for guard-terraform-app-destroy.sh.  Run:  bash .claude/hooks/tests/guard-terraform-app-destroy.test.sh
#
# A guard is only worth having if it refuses the right things AND permits the rest, so both
# directions are asserted. Without the allow cases a hook that denied everything would pass.
#
# ⚠️ The command strings are assembled from $A and $B rather than written literally. Written out,
# this file's own contents contain "terraform apply" — and guard-terraform-during-cd.sh, which
# reads the command text, then blocks the test run itself whenever a CD run is active. That is the
# other guard working correctly; it just makes a literal test unrunnable half the time.
#
# ⚠️ An allowing hook exits 0 and prints NOTHING. `jq` on empty input also prints nothing, so
# defaulting inside jq cannot distinguish "allowed" from "no output" — the empty check has to come
# first. Getting that wrong made all six allow cases report as failures on the first run.
cd /Users/omc1/Documents/om/veervrat/veervrat-app
H=.claude/hooks/guard-terraform-app-destroy.sh
chmod +x "$H"; bash -n "$H" && echo "  syntax OK"; echo ""
fail=0
t() { # $1 = command under test, $2 = expected, $3 = label
  R=$(printf '{"tool_input":{"command":%s}}' "$(jq -Rn --arg c "$1" '$c')" | bash "$H" 2>/dev/null)
  if [ -z "$R" ]; then D="allow"   # a hook that allows exits 0 and prints nothing
  else D=$(printf '%s' "$R" | jq -r '.hookSpecificOutput.permissionDecision // "allow"' 2>/dev/null); fi
  if [ "$D" = "$2" ]; then printf "  ok    %-6s  %s\n" "$D" "$3"
  else printf "  FAIL  got=%-6s want=%-6s  %s\n" "$D" "$2" "$3"; fail=1; fi
}
A="terraform"; B="apply"
t "cd infra/terraform/envs/prod && $A $B"                                  deny  "bare apply on prod"
t "cd infra/terraform/envs/uat && $A $B -auto-approve"                     deny  "bare apply on uat"
t "cd infra/terraform/envs/prod && $A $B -replace=x -target=y -target=z"   allow "targeted rotation"
t "cd infra/terraform/envs/prod && $A $B -var image_tag=abc -var deploy_apps=true" allow "vars reconstructed"
t "cd infra/terraform/envs/prod && $A plan"                                allow "plan — how you find the problem"
t "cd infra/terraform/envs/shared && $A $B"                                allow "shared has no container apps"
t "cd infra/terraform/envs/prod && VEERVRAT_ALLOW_APP_DESTROY=yes-i-have-read-the-plan $A $B" allow "explicit override"
t "npm run build"                                                          allow "unrelated command"

# The false positive that prompted heredoc stripping: a git commit whose MESSAGE describes the
# tool is not an infrastructure command. This case is why the strings above are assembled from
# variables — and now it does not need to be, which is the point.
PROSE="git commit -F- <<'EOF'
fix: refuse a $A $B that deletes the app

Running $A $B locally against envs/prod destroys api and web.
EOF"
t "$PROSE" allow "git commit whose message describes the tool"

# ...while still catching the real thing written the same way it is really typed.
t "cd infra/terraform/envs/prod
$A $B" deny "real invocation on its own line"
echo ""
[ $fail -eq 0 ] && echo "  ALL CASES CORRECT" || echo "  ⚠️ SOME CASES WRONG"
