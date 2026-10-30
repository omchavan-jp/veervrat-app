# [username]

## Overview

Client public profile, follow control and public experience list. [apps/web/app/(app)/u/[username]/page.tsx:PublicProfilePage]

## Interface

- Default export PublicProfilePage reads username, uses usersApi and auth state, and renders optional profile stats, member/online information and counts. [apps/web/app/(app)/u/[username]/page.tsx:PublicProfilePage] [apps/web/lib/api/users.ts:PublicProfile] [apps/web/hooks/use-auth.ts:useAuth]
- Local StatCard accepts label, number/string value and optional sub; genderLabel translates Male/Female and returns other text unchanged. [apps/web/app/(app)/u/[username]/page.tsx:StatCard] [apps/web/app/(app)/u/[username]/page.tsx:genderLabel]
- Experience entries link to /community/experiences/${e.id} and use excerptFromDoc, owned by components/experience/experience-excerpt.ts. [apps/web/app/(app)/u/[username]/page.tsx:PublicProfilePage] [apps/web/components/experience/experience-excerpt.ts:excerptFromDoc]

## Invariants

- Profile query uses public-profile/username key with retry false; experiences query enables only when profile data exists. [apps/web/app/(app)/u/[username]/page.tsx:PublicProfilePage]
- ApiError 404 yields private EmptyState; other profile errors offer retry; stat cards render only for defined fields. [apps/web/app/(app)/u/[username]/page.tsx:PublicProfilePage] [apps/web/lib/api/client.ts:ApiError]
- Follow button is absent for own authenticated profile, disables during mutation and routes anonymous clicks to /login. [apps/web/app/(app)/u/[username]/page.tsx:PublicProfilePage]

## Side Effects

- Queries call usersApi.getPublicProfile and getPublicExperiences, owning GET /users/${encodeURIComponent(username)} and its /experience-logs suffix. [apps/web/app/(app)/u/[username]/page.tsx:PublicProfilePage] [apps/web/lib/api/users.ts:usersApi.getPublicProfile] [apps/web/lib/api/users.ts:usersApi.getPublicExperiences]
- toggleFollow selects usersApi.unfollow/follow from isFollowing and invalidates public-profile/username on success; APIs own DELETE/POST /users/${encodeURIComponent(username)}/follow. [apps/web/app/(app)/u/[username]/page.tsx:toggleFollow] [apps/web/lib/api/users.ts:usersApi.follow] [apps/web/lib/api/users.ts:usersApi.unfollow]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
