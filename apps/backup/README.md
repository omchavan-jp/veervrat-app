# Backup

## Overview

The backup script dumps PostgreSQL, encrypts and verifies the dump, and uploads it to Azure Blob storage. [backup.sh:pg_dump] [backup.sh:openssl] [backup.sh:azcopy]

The Azure Blob copy is staging in the same subscription as the database; an off-site copy requires pulling it outside Azure. [backup.sh:REMINDER]

## Interface

- Configuration includes the database URL, encryption key, storage account, container, environment, retention and managed identity settings. [backup.sh:DATABASE_URL] [backup.sh:BACKUP_ENCRYPTION_KEY] [backup.sh:AZCOPY_MSI_CLIENT_ID]

## Invariants

- The script checks dump size, the decrypted PostgreSQL header and byte equality, then checks the upload listing. [backup.sh:PLAIN_BYTES] [backup.sh:cmp] [backup.sh:azcopy list]

## Side Effects

- Temporary files are created and cleaned up; encrypted dumps are uploaded and expired blobs removed. [backup.sh:cleanup] [backup.sh:azcopy remove]

## Verification

`bash -n apps/backup/backup.sh` checks shell syntax from the repository root without executing the backup. It was not run during documentation generation.
