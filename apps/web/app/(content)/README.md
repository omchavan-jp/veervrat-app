# (content)

## Overview

Content shell composes translated messages with authentication-dependent chrome. [apps/web/app/(content)/layout.tsx:ContentLayout] [apps/web/app/(content)/layout-client.tsx:ContentLayoutClient]

## Interface

- Default async ContentLayout accepts children, gets messages and nests ContentLayoutClient under NextIntlClientProvider. [apps/web/app/(content)/layout.tsx:ContentLayout]
- Exported ContentLayoutClient accepts children and reads useAuth. [apps/web/app/(content)/layout-client.tsx:ContentLayoutClient]
- [community](./community/README.md): Contains documented subdirectories.
- [pothi](./pothi/README.md): Pothi section reader with bilingual headings and embedded shlokas. [apps/web/app/(content)/pothi/page.tsx:PothiPage]
- [resources](./resources/README.md): Resource browser with type filtering and fetched detail dialogs. [apps/web/app/(content)/resources/page.tsx:ResourcesPage]
- [sentences](./sentences/README.md): Contains documented subdirectories.
- [shlokas](./shlokas/README.md): Shloka browser with debounced search and fetched detail dialogs. [apps/web/app/(content)/shlokas/page.tsx:ShlokasPage]
- [subvirtues](./subvirtues/README.md): Contains documented subdirectories.
- [virtues](./virtues/README.md): Browser combines virtue cards and weaknesses flattened from clusters. [apps/web/app/(content)/virtues/page.tsx:VirtuesBrowserPage]
- [weaknesses](./weaknesses/README.md): Contains documented subdirectories.

## Invariants

- AppShell is selected only when isAuthenticated and user are both truthy; otherwise a guest header and login link wrap the children. [apps/web/app/(content)/layout-client.tsx:ContentLayoutClient]

## Side Effects

- Loads translated messages with getMessages. [apps/web/app/(content)/layout.tsx:ContentLayout]

## Verification

From the repository root: `pnpm --filter web test`. This package-level command was not run during documentation generation.
