# Frontend Conventions — v1

## 1. Framework and routing

- **Next.js with App Router**
- TypeScript strict mode
- all routes use the `app/` directory — no `pages/` directory

## 2. Route structure

Role-segmented routes within a single app:

⚠️ **Corrected 2026-08-16.** This previously used "mentor" and "mentees", violating the
domain-language rule in `../AGENTS.md` (*vratmitra*, not mentor; *vratarthi*, not user), and
listed routes that never existed. Actual structure:

```
app/
  (public)/       login, signup, forgot-password, reset-password
  (app)/          dashboard, journeys/[id], study, actions, profile, settings
  (vratmitra)/    my-vratarthis, vm-actions
  (moderation)/   moderation dashboard
  (admin)/        dashboard, users, platform
```

**Use the domain vocabulary in route names, components and copy.** `spec/CONTEXT.md` is
canonical: vratarthi, vratmitra (global vs journey), weakness, sentence — never user, mentor,
mentee, lacuna or statement.

### Rules
- route groups `(public)`, `(app)`, `(mentor)`, etc. apply shared layouts and auth guards
- each group has its own layout with appropriate navigation
- a user with multiple roles (e.g., user + mentor) navigates between sections — they are not separate apps
- loading and error boundaries are defined per route group

## 3. Server vs client components

### Default to server components
- pages and layouts are server components by default
- data fetching on initial load happens in server components
- add `'use client'` only when the component needs interactivity (event handlers, hooks, browser APIs)

### Client components are used for
- forms and interactive inputs
- components using `useState`, `useEffect`, `useRef`
- components using TanStack Query for client-side data
- anything with click handlers, modals, dropdowns

### Rules
- never add `'use client'` to a page file just because a child needs it — extract the interactive part into a client component
- keep client component boundaries as small as possible
- server components can import and render client components, not the reverse

## 4. Data fetching

### Server-side (initial load, SEO-relevant pages)
- fetch data directly in server components using `fetch` or a server-side API client
- use Next.js caching and revalidation where appropriate

### Client-side (interactive, user-specific, real-time)
- use **TanStack Query** (`@tanstack/react-query`) for all client-side server state
- every API call goes through a typed API client (see section 8)

### TanStack Query rules
- query keys are structured arrays: `['journeys', journeyId]`, `['journeys', { status: 'active' }]`
- define query keys in a central `queryKeys.ts` file to avoid duplication
- mutations use `useMutation` with `onSuccess` invalidation of affected queries
- no manual cache manipulation unless absolutely necessary — prefer invalidation
- stale time and cache time are configured globally with sensible defaults, overridden per-query only when needed

### What goes where
| Scenario | Approach |
|---|---|
| Page initial data (e.g., journey detail) | Server component fetch |
| Lists with filtering/pagination | TanStack Query |
| Form submissions | `useMutation` |
| Data that updates frequently | TanStack Query with short stale time |
| Auth state (current user) | TanStack Query, hydrated from server |

## 5. State management

### No global state library
- **server state**: TanStack Query
- **auth state**: TanStack Query (current user query, invalidated on login/logout)
- **local UI state**: `useState` in the component that needs it
- **shared UI state** (e.g., sidebar open/closed, theme): React Context, scoped to the relevant subtree

### Rules
- do not install Zustand, Redux, Jotai, or similar unless a clear need emerges that Context + Query cannot handle
- if you find yourself reaching for global state, first ask: is this server state (→ Query) or parent-owned UI state (→ lift up or Context)?

## 6. Forms

- use **React Hook Form** for all non-trivial forms
- use **Zod** for form validation schemas
- connect them with `@hookform/resolvers/zod`

```typescript
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const form = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

### Rules
- validation schemas live next to the form component or in a shared `schemas/` directory if reused
- show field-level errors inline, not as a toast or alert
- disable submit button while submitting
- handle server-side validation errors by mapping them to form fields where possible

## 7. Styling

- **Tailwind CSS** utility classes only — no custom CSS files except for global resets in `globals.css`
- **shadcn/ui** as the component library — components are copied into the project, not installed as a dependency
- use the `cn()` utility (clsx + tailwind-merge) for conditional classes

### Rules
- no CSS modules, styled-components, or emotion
- do not add other component libraries (MUI, Chakra, Ant Design, etc.)
- customise shadcn/ui components by editing the copied source — they are your code
- define a consistent color palette and spacing scale in `tailwind.config.ts` — don't use arbitrary values like `text-[#3a7b4f]` when a theme token exists

## 8. API client

A typed API client in `lib/api/` handles all communication with the NestJS backend.

```
lib/
  api/
    client.ts        → base fetch wrapper (credentials, base URL, error handling)
    journeys.ts      → export functions: getJourneys, getJourney, createJourney, etc.
    auth.ts          → login, logout, register, getCurrentUser, etc.
    users.ts
    ...
```

### Rules
- `client.ts` sets `credentials: 'include'` for cookie-based auth
- each domain file exports plain async functions, not hooks
- functions are typed: input params → response type
- hooks (`useQuery`, `useMutation`) are used in components, calling these functions
- never use raw `fetch` in components — always go through the API client
- error handling: the client throws typed errors that components can catch

## 9. Component conventions

### File structure
```
components/
  ui/              → shadcn/ui primitives (Button, Input, Dialog, etc.)
  layout/          → AppLayout, Sidebar, Header, MobileNav
  shared/          → reusable app-specific components (UserAvatar, JourneyCard, EmptyState)
  [feature]/       → feature-specific components if needed (journey/, assessment/)
```

### Rules
- one component per file, named export, PascalCase filename
- colocate component-specific types and helpers in the same file unless shared
- no barrel files (`index.ts` re-exporting everything) — import directly from the component file
- components accept props, not global state — pass data down explicitly

## 10. Error and loading states

- every page/route that fetches data must handle loading, error, and empty states
- use Next.js `loading.tsx` and `error.tsx` files for route-level boundaries
- for client-side queries, handle `isLoading`, `isError`, `data` states explicitly
- empty states show a helpful message with a suggested action, not a blank page
- error states show a user-friendly message — never expose raw error messages or stack traces

## 11. Icons and assets

- **lucide-react** is the only icon library — do not add Font Awesome, Heroicons, etc.
- static assets (images, SVGs) go in `public/` and are referenced via absolute paths
- prefer SVG icons from lucide over custom icon assets

## 12. Accessibility baseline

- all interactive elements must be keyboard-accessible
- images have `alt` text
- form inputs have associated labels
- use semantic HTML (`button` for actions, `a` for navigation, `nav`, `main`, `section`)
- shadcn/ui components handle most of this — don't break it when customising
- colour contrast must meet WCAG AA

## 13. What not to do

- do not fetch data in `useEffect` — use TanStack Query or server components
- do not store server state in `useState` — that's what Query is for
- do not put API URLs or secrets in client-side code
- do not use `any` — if the type is complex, define it properly
- do not suppress TypeScript errors with `@ts-ignore` or `as any`
- do not install utility libraries for things that are one-liners (e.g., `lodash.get` when optional chaining exists)
