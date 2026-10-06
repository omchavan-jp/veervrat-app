#!/usr/bin/env bash
set -euo pipefail

app_changed=false
docs_changed=false

while IFS= read -r file; do
  [[ -z "$file" ]] && continue

  case "$file" in
    product-design/*)
      if [[ "$file" != *.md ]]; then docs_changed=true; fi
      ;;
    documentation/*|ops/*|openspec/*|spec/*|.claude/*|*.md)
      ;;
    *)
      app_changed=true
      ;;
  esac
done

printf 'app_changed=%s\ndocs_changed=%s\n' "$app_changed" "$docs_changed"
