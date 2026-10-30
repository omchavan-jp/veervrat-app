# admin

## Overview

Admin content module registers taxonomy, shloka scheduling/queue, pothi section and resource controllers, services and a shared repository. [admin.module.ts:AdminModule]

## Interface

- TaxonomyController: POST admin/virtues, admin/subvirtues, admin/weaknesses; PATCH and DELETE each corresponding /:id; POST and DELETE admin/weakness-subvirtues (DELETE takes weaknessId/subvirtueId queries). TaxonomyService exports matching CRUD/link operations. [taxonomy.controller.ts:TaxonomyController] [taxonomy.service.ts:TaxonomyService]
- AdminShlokasController: POST admin/shlokas, PATCH/DELETE admin/shlokas/:id; GET/PATCH admin/shlokas/schedule, DELETE admin/shlokas/schedule/:date; GET/PATCH admin/shlokas/queue. AdminShlokasService implements these operations. [admin-shlokas.controller.ts:AdminShlokasController] [admin-shlokas.service.ts:AdminShlokasService]
- AdminPothiController and AdminResourcesController expose POST admin/pothi/sections and admin/resources, plus PATCH/DELETE on each /:id; their exported services implement create/update/remove. [admin-pothi.controller.ts:AdminPothiController] [admin-resources.controller.ts:AdminResourcesController] [admin-pothi.service.ts:AdminPothiService] [admin-resources.service.ts:AdminResourcesService]
- AdminContentRepository exports taxonomy CRUD/link, shloka CRUD/count/schedule/queue, pothi section CRUD, and resource CRUD methods. [admin-content.repository.ts:AdminContentRepository]
- [dto](./dto/README.md): Validated payloads for pothi sections, resources, shlokas and taxonomy.

## Invariants

- All four controllers declare SessionGuard; services require platform admin.manage_taxonomy, admin.manage_shlokas, admin.manage_pothi and admin.manage_resources respectively. [taxonomy.controller.ts:TaxonomyController] [admin-shlokas.controller.ts:AdminShlokasController] [admin-pothi.controller.ts:AdminPothiController] [admin-resources.controller.ts:AdminResourcesController] [taxonomy.service.ts:assert] [admin-shlokas.service.ts:assert] [admin-pothi.service.ts:assert] [admin-resources.service.ts:assert]
- Taxonomy deletion rejects virtues with subvirtues, subvirtues with sentences or weakness links, and weaknesses referenced by journeys, exposures, resolutions, challenges or test attempts; update/delete require an existing target. [taxonomy.service.ts:deleteVirtue] [taxonomy.service.ts:deleteSubvirtue] [taxonomy.service.ts:deleteWeakness] [taxonomy.service.ts:updateVirtue] [taxonomy.service.ts:updateSubvirtue] [taxonomy.service.ts:updateWeakness]
- Pothi shloka lists and replacement queues reject duplicates and unknown shloka IDs; schedule requires an existing shloka, parses a YYYY-MM-DD prefix at UTC midnight, and defaults schedule listing to today through 60 days later. [admin-pothi.service.ts:assertShlokas] [admin-shlokas.service.ts:reorderQueue] [admin-shlokas.service.ts:schedule] [admin-shlokas.service.ts:parseDate] [admin-shlokas.service.ts:listSchedule]
- Resource create/update sanitizes supplied descriptions and maps InvalidTiptapContentError to ValidationException; resource and pothi update/remove require existing targets. [admin-resources.service.ts:sanitize] [admin-resources.service.ts:update] [admin-resources.service.ts:remove] [admin-pothi.service.ts:update] [admin-pothi.service.ts:remove]

## Side Effects

- Repository creates, updates and hard-deletes taxonomy/content records; shloka/resource tag replacement, queue replacement and pothi membership replacement use transactions; shloka deletion removes schedule, queue and pothi membership rows first. [admin-content.repository.ts:AdminContentRepository] [admin-content.repository.ts:updateShloka] [admin-content.repository.ts:updateResource] [admin-content.repository.ts:replaceQueue] [admin-content.repository.ts:updatePothiSection] [admin-content.repository.ts:deleteShloka]
- Shloka create/update invokes ContentService.syncShlokaToIndex and removal invokes removeShlokaFromIndex after repository completion, without awaiting these calls. [admin-shlokas.service.ts:create] [admin-shlokas.service.ts:update] [admin-shlokas.service.ts:remove]
- Mutation endpoints carry Audited metadata for taxonomy, shlokas, scheduling/queue, pothi and resources. [taxonomy.controller.ts:TaxonomyController] [admin-shlokas.controller.ts:AdminShlokasController] [admin-pothi.controller.ts:AdminPothiController] [admin-resources.controller.ts:AdminResourcesController]

## Verification

From the repository root:

```sh
pnpm --filter api test:unit
```

The [`test:unit`](./../../../package.json) script runs `vitest run --project unit`. This is a package-level check; these documentation changes did not run it.
