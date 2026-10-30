# featured

## Overview

Client curation panel lists blogs and public experiences and toggles featured status. [apps/web/app/(admin)/admin/featured/page.tsx:FeaturedPanel]

## Interface

- Default export FeaturedPanel(); local FeaturedTab union is blogs | experiences and defaults to blogs; local StarToggle accepts on, onClick, busy and label. [apps/web/app/(admin)/admin/featured/page.tsx:FeaturedPanel]

## Invariants

- Both list queries enabled only for isAdmin; ready non-admin renders null and unready guard renders spinner. [apps/web/app/(admin)/admin/featured/page.tsx:FeaturedPanel]
- StarToggle disables interaction while corresponding mutation is pending and exposes current state with aria-pressed. [apps/web/app/(admin)/admin/featured/page.tsx:FeaturedPanel]

## Side Effects

- Queries imported blogsApi.list and experienceLogsApi.getPublic. [apps/web/app/(admin)/admin/featured/page.tsx:FeaturedPanel]
- Toggle handlers call imported adminApi.featureBlog or adminApi.featureExperience with inverted featured value; success invalidates corresponding list query and errors trigger destructive toast. [apps/web/app/(admin)/admin/featured/page.tsx:FeaturedPanel]
- Invokes imported useAdminGuard [apps/web/hooks/use-admin-guard.ts:useAdminGuard]. [apps/web/app/(admin)/admin/featured/page.tsx:FeaturedPanel]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
