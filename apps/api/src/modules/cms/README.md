# cms

## Overview

Bilingual CMS pages expose public lookup and authorized management by stable key. [cms.controller.ts:CmsController] [cms.service.ts:CmsService]

## Interface

- Optional-session GET cms-pages/:key; session GET/POST admin/cms-pages and PATCH/DELETE admin/cms-pages/:key. [cms.controller.ts:CmsController]
- Exports CmsController, CmsRepository, CmsService and CmsModule classes; CmsModule exports CmsService for consumers. [cms.controller.ts:CmsController] [cms.repository.ts:CmsRepository] [cms.service.ts:CmsService] [cms.module.ts:CmsModule]
- [dto](./dto/README.md): CMS DTOs validate stable keys and bilingual page titles and rich-text objects.

## Invariants

- Management methods assert admin.manage_content permission; lookup/update/remove reject missing pages; body fields are sanitized and invalid Tiptap becomes ValidationException. [cms.service.ts:assert] [cms.service.ts:getByKey] [cms.service.ts:update] [cms.service.ts:remove] [cms.service.ts:sanitize]

## Side Effects

- Prisma reads/lists/upserts/updates and permanently deletes CMS rows; writes updatedById on create/update. [cms.repository.ts:CmsRepository]
- Management mutations attach admin.upsert_cms_page/admin.update_cms_page/admin.delete_cms_page audit metadata with page key and cms_page resource type. [cms.controller.ts:upsert] [cms.controller.ts:update] [cms.controller.ts:remove]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
