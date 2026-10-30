# Repository scripts

## Overview

Scripts audit route and relationship surfaces, manage off-Azure backup pulls and their macOS scheduler, and report potentially stranded Git work. [audit-surface-map.py:main] [audit-vm-model.py:main] [pull-backups.sh:report] [install-backup-pull-agent.sh:LABEL] [unmerged-work.sh:problems]

## Interface

- The Python audit scripts accept an optional repository root and print JSON. [audit-surface-map.py:ROOT] [audit-vm-model.py:ROOT]
- The backup pull accepts `--status`, its scheduler installer accepts `--uninstall`, and the Git work report accepts `--all`. [pull-backups.sh:STATUS_ONLY] [install-backup-pull-agent.sh:--uninstall] [unmerged-work.sh:SHOW_ALL]

## Invariants

- The surface audit compares backend and frontend targets with normalized web routes; the relationship audit flags relevant state-filtered reads and single-scope methods. [audit-surface-map.py:resolves] [audit-vm-model.py:READ_OPS]
- Both audits inspect source text with regular expressions. Their findings need review: they do not execute routes or prove that a query's `endedAt` filter is correct. [audit-surface-map.py:parse_case_map] [audit-vm-model.py:call_body] [audit-vm-model.py:filters_endedAt]
- Backup pulls use per-environment keys and verify the decrypted PostgreSQL dump header before recording copies. [pull-backups.sh:key_file_for] [pull-backups.sh:openssl]
- Pull defaults cover UAT and production, retain 30 days, and flag copies older than 48 hours. Status is based on local filenames and timestamps; it does not re-decrypt existing copies or check their manifest hashes. The LaunchAgent runs hourly by default and once when loaded. [pull-backups.sh:ENVIRONMENTS] [pull-backups.sh:RETENTION_DAYS] [pull-backups.sh:report] [install-backup-pull-agent.sh:INTERVAL_SECONDS] [install-backup-pull-agent.sh:RunAtLoad]

## Side Effects

- Backup pulls read Azure and can download, verify and prune files while updating a manifest. Even status mode creates the destination and manifest when absent. [pull-backups.sh:MANIFEST] [pull-backups.sh:STATUS_ONLY] [pull-backups.sh:PRUNED]
- The scheduler installer writes a plist and changes launchctl state; the Git report may read GitHub pull request state. [install-backup-pull-agent.sh:PLIST] [unmerged-work.sh:HAVE_GH]

## Verification

There is no dedicated test command in this directory. Inspect each script before running it.
