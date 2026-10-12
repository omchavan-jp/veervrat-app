#!/usr/bin/env bash
set -euo pipefail
umask 077

vars_file="$1"
case "$vars_file" in
  "$RUNNER_TEMP"/digest-deployment-*/held.tfvars.json|"$RUNNER_TEMP"/digest-deployment-*/final.tfvars.json) ;;
  *) echo '::error::unexpected image variable-file path'; exit 1 ;;
esac
plan_file="$(mktemp "$RUNNER_TEMP/image-stage-plan.XXXXXX")"
if ! terraform plan -input=false -lock-timeout=60s -out="$plan_file" -var-file="$vars_file" > "$plan_file.log" 2>&1; then
  echo '::error::image-stage plan failed; no apply performed'
  exit 1
fi
if ! terraform show -json "$plan_file" | jq -e '
  (.format_version | type == "string") and (.resource_changes | type == "array") and
  all(.resource_changes[]; (.change.actions | index("delete")) == null)
' > /dev/null; then
  echo '::error::routine CD refuses deletion/replacement or unreadable plan; maintainer assessment required'
  exit 1
fi
if [ -n "${MANIFEST_FILE:-}" ]; then
  terraform show -json "$plan_file" > "$plan_file.json"
  node "$GITHUB_WORKSPACE/.github/scripts/check-production-plan.mjs" "$plan_file.json"
fi
terraform apply -input=false -lock-timeout=60s "$plan_file"
