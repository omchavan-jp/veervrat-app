#!/usr/bin/env bash
set -euo pipefail

classifier="$(dirname "$0")/classify-changes.sh"

check() {
  local name="$1" files="$2" expected="$3" actual
  actual="$(printf '%s\n' "$files" | bash "$classifier")"
  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL: %s\nexpected:\n%s\nactual:\n%s\n' "$name" "$expected" "$actual" >&2
    exit 1
  fi
}

check docs-only $'product-design/README.mdx\nproduct-design/01-product-model/diagrams/product-foundation.d2\nproduct-design/00-governance/decision-registry.json\nproduct-design/tooling/app/global.css' $'app_changed=false\ndocs_changed=true'
check app-only $'apps/web/proxy.ts\napps/api/src/config/config.module.ts' $'app_changed=true\ndocs_changed=false'
check mixed $'apps/web/proxy.ts\nproduct-design/tooling/package.json' $'app_changed=true\ndocs_changed=true'
check ignored-docs $'documentation/21_Infrastructure-Conventions.md\nopenspec/specs/a.md\nproduct-design/tooling/README.md' $'app_changed=false\ndocs_changed=false'
check unknown 'new-top-level/config.yaml' $'app_changed=true\ndocs_changed=false'
check docs-infra 'infra/terraform/modules/environment/product-docs.tf' $'app_changed=false\ndocs_changed=true'
check shared-infra 'infra/terraform/modules/environment/container-apps.tf' $'app_changed=true\ndocs_changed=false'

echo 'CD path classification passed'
