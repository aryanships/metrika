# UI Architecture Guide — Digital Metrology

This is the authoritative guide for how the **client-facing UI** of the Digital
Metrology app is structured: where files live, how data flows from oRPC into
React, how loading/error states are handled, and how to keep components clean.

It upgrades the proven layout/section/view pattern from the YouTube-clone
reference (`plan/next15-youtube-clone`) — which used tRPC — onto our stack:

- **API**: oRPC v2, contract-first (`@orpc/server`, `@orpc/contract`)
- **Data fetching**: TanStack Query (`@tanstack/react-query`) via `@orpc/tanstack-query`
- **Framework**: Next.js 16 (App Router), React 19
- **UI primitives**: Base UI + shadcn-style (`components/ui/*`)
- **Validation/types**: Zod 4 — UI props are typed from `z.infer<typeof Schema>`.

> The backend (contracts, `server/`, Prisma 8) is described separately in
> `docs/database-workflow.md` and the plan docs. This document only concerns the UI.

---

## Table of contents

1. [Mental model](#1-mental-model)
2. [Setup & wiring](#2-setup--wiring)
3. [Directory map — what goes where](#3-directory-map--what-goes-where)
4. [The layer taxonomy](#4-the-layer-taxonomy)
5. [Data-fetching recipes](#5-data-fetching-recipes)
6. [When to create a component](#6-when-to-create-a-component)
7. [Cleanliness & maintenance rules](#7-cleanliness--maintenance-rules)
8. [Worked example — Applications module](#8-worked-example--applications-module)
9. [tRPC → oRPC migration map](#9-trpc--orpc-migration-map)
10. [Anti-patterns & gotchas](#10-anti-patterns--gotchas)
11. [Definition of done](#11-definition-of-done)

---

## 1. Mental model

Everything is built from **four kinds of React components** plus **route files**,
layered so that data fetching happens in exactly one place and loading states are
automatic.

```
Route file (app/...)          thin: read params, prefetch, render layout+view
      │
      ▼
Layout (ui/layouts/*)         app shell: nav, sidebar, providers. NO data, NO hooks
      │
      ▼
View (ui/views/*)             Server Component: composes sections, passes ids/params
      │
      ▼
Section (ui/sections/*)       Client Component: the ONLY layer that fetches/mutates
      │                         wraps itself in <Suspense> + <ErrorBoundary>
      ▼
Component (ui/components/*)   presentational: props in, JSX out, no data fetching
```

Rules that fall out of this:

1. **Views never fetch.** A view is a pure function that turns props into a layout
   of sections/components. It stays a Server Component.
2. **Sections fetch.** A section owns one query (or a tightly-related query +
   mutation) and owns its own loading skeleton + error fallback.
3. **Components are dumb.** They receive already-fetched data as props. This makes
   them trivially reusable and testable.
4. **Routes prefetch.** The `page.tsx` reads `params`/`searchParams`, fires
   non-blocking `prefetch*`, and hands a hydrated query cache to the view.

This mirrors the clone's pattern (`home-videos-section.tsx` = section,
`home-view.tsx` = view, `page.tsx` = prefetch) but swaps tRPC hooks for oRPC +
TanStack Query utilities.

---

## 2. Setup & wiring

### 2.1 Install the missing package

`@orpc/tanstack-query` is already installed, but the React hooks it builds options
for live in `@tanstack/react-query`, which is **not yet installed** (only
`@tanstack/query-core` is present as a transitive dep):

```bash
bun add @tanstack/react-query
```

Optional — only if/when we adopt server functions/form actions for mutations:

```bash
bun add @orpc/next@beta
```

### 2.2 Query client factory

Create `lib/query-client.ts`. This file is imported by **both** server and client
bundles, so it must stay environment-agnostic (no `next/headers`, no `window`):

```ts
// lib/query-client.ts
import {
  QueryClient,
  defaultShouldDehydrateQuery,
  type Query,
} from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // > 0 avoids an immediate refetch on mount after hydration
        staleTime: 30 * 1000,
      },
    },
  })
}

/**
 * Dehydrate config used in pages: keep pending queries so prefetch that is
 * still in flight on the server is not dropped before hydration.
 */
export const dehydrateOptions = {
  shouldDehydrateQuery: (query: Query) =>
    defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
}
```

> Our oRPC output schemas already serialize to plain JSON (dates are ISO strings,
> see `modules/*/schema.ts`), so the default serializer is sufficient. If a
> procedure ever returns `Date`, `Map`, etc., add the oRPC `RPCJsonSerializer`
> custom serializer — see the TanStack Query SSR section of the oRPC docs.

### 2.3 Server query client (per-request)

Create `lib/query-client.server.ts`, guarded with `server-only`:

```ts
// lib/query-client.server.ts
import 'server-only'
import { cache } from 'react'
import { makeQueryClient } from './query-client'

/** Stable query client for the lifetime of one request. */
export const getQueryClient = cache(makeQueryClient)
```

### 2.4 oRPC TanStack Query utils

`lib/orpc.ts` already exports the shared client (`globalThis.$client` on the
server, `RPCLink` client in the browser). Add one file that wraps it:

```ts
// lib/orpc-query.ts
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { client } from './orpc'

/**
 * The single source of query/mutation options for the app.
 *   orpc.applications.listMine.queryOptions({ input })
 *   orpc.applications.listMine.infiniteOptions({ input: pageParam => ... })
 *   orpc.applications.submit.mutationOptions()
 */
export const orpc = createTanstackQueryUtils(client)
```

`createTanstackQueryUtils` is a pure factory — safe to instantiate once at module
scope. On the server, `client` resolves to the in-process router client
(`lib/orpc.server.ts`); in the browser it resolves to the `/rpc` fetch link.

### 2.5 Providers

Create `components/providers.tsx` (Client Component) and mount it in the root
layout:

```tsx
// components/providers.tsx
'use client'

import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeQueryClient } from '@/lib/query-client'

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  // Server: fresh client per render. Browser: one singleton per session.
  if (typeof window === 'undefined') return makeQueryClient()
  return (browserQueryClient ??= makeQueryClient())
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Deliberately NOT useState: a client created in useState is thrown away if
  // the tree suspends before any Suspense boundary mounts (see TanStack SSR docs).
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  )
}
```

```tsx
// app/layout.tsx (root)
import { Providers } from '@/components/providers'
// ...existing fonts/metadata

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={/* existing */}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

---

## 3. Directory map — what goes where

```
app/
  (auth)/                    # public/unauthenticated route group
    login/page.tsx
  (dashboard)/               # authenticated app shell route group
    layout.tsx               # renders modules/<x>/ui/layouts/dashboard-layout
    applications/
      page.tsx               # prefetch + <ApplicationsView/>
      [id]/
        page.tsx             # prefetch + <ApplicationView id/>
  layout.tsx                 # root: fonts, Providers, toaster
  rpc/[[...rest]]/route.ts   # existing oRPC handler — do not touch for UI work
  api/[[...rest]]/route.ts   # existing OpenAPI handler — do not touch

components/
  ui/                        # Base UI + shadcn primitives (button, dialog, ...)
  providers.tsx              # QueryClientProvider
  infinite-scroll.tsx        # shared sentinel-based loader (ported from clone)
  empty-state.tsx            # shared "nothing here" card
  error-state.tsx            # shared error fallback with retry

lib/
  orpc.ts                    # exists — shared client
  orpc.server.ts             # exists — SSR router client
  orpc-query.ts              # NEW — createTanstackQueryUtils(client) -> `orpc`
  query-client.ts            # NEW — makeQueryClient + dehydrateOptions
  query-client.server.ts     # NEW — getQueryClient (React cache, server-only)
  utils.ts                   # exists — cn()

hooks/
  use-intersection-observer.ts  # generic, cross-module hooks (port from clone)

modules/<feature>/
  contract.ts                # exists — API contract (oc)
  schema.ts                  # exists — Zod schemas + inferred types
  server/
    router.ts                # exists — implement(contract)
    service.ts               # exists — business logic
    repository.ts            # exists — data access
  ui/
    layouts/                 # module-specific shell (only if not shared)
      <feature>-layout.tsx
    views/                   # Server Components that compose sections
      <feature>-view.tsx
      <feature>-detail-view.tsx
    sections/                # Client Components that fetch
      <feature>-list-section.tsx
      <feature>-detail-section.tsx
    components/              # presentational pieces
      <feature>-card.tsx
      <feature>-status-badge.tsx
    hooks/                   # module-scoped client hooks (mutations, etc.)
      use-<feature>-mutations.ts
```

**Where does a new file go?** Use these questions in order:

| Question | Location |
| --- | --- |
| Is it a shadcn/Base UI primitive (button, dialog, select)? | `components/ui/` |
| Is it generic app chrome reused across modules (infinite-scroll, empty/error states, providers)? | `components/` |
| Is it a generic hook reused across modules? | `hooks/` |
| Does it belong to a single feature/domain? | `modules/<feature>/ui/<layer>/` |
| Is it a page/route entry? | `app/.../page.tsx` |

---

## 4. The layer taxonomy

### 4.1 Route files (`app/**/page.tsx`, `layout.tsx`)

Thin. They only:

- read `params` / `searchParams` (both are `Promise`s — `await` them),
- fire **non-blocking** prefetches (`void queryClient.prefetch...`),
- wrap children in `<HydrationBoundary state={dehydrate(queryClient, dehydrateOptions)}>`,
- render one view (or one layout).

Use the global `PageProps` / `LayoutProps` helpers (typed by route literal, no
import needed) for strict `params`/`searchParams`:

```tsx
export default async function Page({ params }: PageProps<'/applications/[id]'>) {
  const { id } = await params
  // ...
}
```

### 4.2 Layouts (`ui/layouts/*`)

Server Components (or thin wrappers over Client Components). They render shared
chrome — nav, sidebar, breadcrumbs — and `{children}`. **No data fetching, no
hooks.** They must not read `searchParams` (layouts don't re-render on navigation).

### 4.3 Views (`ui/views/*`)

Server Components. Pure composition: accept ids/params as props, arrange sections
and components, set the page's max-width/spacing. **No data fetching.** Because
views are server components, the data-heavy parts (sections) stream in behind
their own Suspense boundaries.

### 4.4 Sections (`ui/sections/*`)

Client Components (`'use client'`). **The only layer allowed to call oRPC/TanStack
hooks.** A section follows this exact shape (see the clone's
`home-videos-section.tsx`):

```tsx
'use client'
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
// query hooks + orpc

export function SomeSection({ id }: { id: string }) {
  return (
    <Suspense key={id} fallback={<SomeSectionSkeleton />}>
      <ErrorBoundary FallbackComponent={SectionError}>
        <SomeSectionContent id={id} />
      </ErrorBoundary>
    </Suspense>
  )
}

function SomeSectionContent({ id }: { id: string }) {
  const { data } = useSuspenseQuery(orpc.x.get.queryOptions({ input: { id } }))
  return <>{/* render data */}</>
}
```

Notes:

- `<Suspense key={id}>` resets the boundary when the id changes (important for
  filtering/navigation), copied from the clone's `key={props.categoryId}`.
- The skeleton lives **in the same file** and is exported for reuse in page-level
  `loading.tsx` if desired.
- `useSuspenseQuery`/`useSuspenseInfiniteQuery` are required for Suspense; on
  error they throw to the nearest `ErrorBoundary`.

### 4.5 Components (`ui/components/*`)

Presentational. Props in, JSX out. Props are typed from the module's schema
(`ApplicationOutput`, etc.). No query hooks, no `fetch`, no router/navigation
(except `Link` for navigation-only components).

---

## 5. Data-fetching recipes

The oRPC utils produce TanStack Query **options objects**; the actual hooks come
from `@tanstack/react-query`. This replaces tRPC's `trpc.x.y.useSuspenseQuery()`.

### 5.1 Single resource (suspense)

```tsx
'use client'
import { useSuspenseQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc-query'

function Section({ id }: { id: string }) {
  const { data } = useSuspenseQuery(
    orpc.applications.get.queryOptions({ input: { id } }),
  )
  return <ApplicationDetail application={data} />
}
```

### 5.2 Paginated list (suspense + infinite)

Our pagination is page-based (`PaginationInputSchema`: `page`, `limit`, plus
optional `cursor`). For infinite scroll, drive `pageParam` off `page`:

```tsx
'use client'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc-query'
import { InfiniteScroll } from '@/components/infinite-scroll'
import { ApplicationCard } from '../components/application-card'

const PAGE_SIZE = 20

function ListContent() {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      orpc.applications.listMine.infiniteOptions({
        input: (pageParam: number) => ({ page: pageParam, limit: PAGE_SIZE }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
      }),
    )

  const items = data.pages.flatMap((page) => page.items)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((app) => (
        <ApplicationCard key={app.id} application={app} />
      ))}
      <InfiniteScroll
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  )
}
```

> Cursor-based lists are equally supported: return `nextCursor` in the service and
> use `input: (pageParam: string | undefined) => ({ cursor: pageParam, limit })`
> with `getNextPageParam: lastPage => lastPage.pagination.nextCursor`. Pick one
> per list and stay consistent — for our domain, page-based is preferred.

### 5.3 Prefetch in the page (server)

The critical upgrade from the clone: tRPC's `HydrateClient` becomes TanStack
Query's `<HydrationBoundary>` + `dehydrate`. Do **not** `await` the prefetch —
fire it so rendering stays non-blocking and streams:

```tsx
// app/(dashboard)/applications/page.tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc-query'
import { getQueryClient } from '@/lib/query-client.server'
import { dehydrateOptions } from '@/lib/query-client'
import { ApplicationsView } from '@/modules/applications/ui/views/applications-view'

const PAGE_SIZE = 20

export default async function Page() {
  const queryClient = getQueryClient()

  void queryClient.prefetchInfiniteQuery(
    orpc.applications.listMine.infiniteOptions({
      input: (pageParam: number) => ({ page: pageParam, limit: PAGE_SIZE }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    }),
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient, dehydrateOptions)}>
      <ApplicationsView />
    </HydrationBoundary>
  )
}
```

Detail page with a dynamic id:

```tsx
export default async function Page({ params }: PageProps<'/applications/[id]'>) {
  const { id } = await params
  const queryClient = getQueryClient()

  void queryClient.prefetchQuery(
    orpc.applications.get.queryOptions({ input: { id } }),
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient, dehydrateOptions)}>
      <ApplicationView id={id} />
    </HydrationBoundary>
  )
}
```

### 5.4 Mutations + cache invalidation

Mutations use `.mutationOptions()`. Invalidate with the partial-match `.key()`,
and use `.queryKey({ input })` for full-match `setQueryData` (optimistic updates):

```tsx
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isInferableError } from '@orpc/client'
import { orpc } from '@/lib/orpc-query'

export function useSubmitApplication() {
  const queryClient = useQueryClient()

  return useMutation(
    orpc.applications.submit.mutationOptions({
      onSuccess: (updated) => {
        // Update the cached detail instantly, then refresh the list.
        queryClient.setQueryData(
          orpc.applications.get.queryKey({ input: { id: updated.id } }),
          updated,
        )
        queryClient.invalidateQueries({ queryKey: orpc.applications.key() })
      },
      onError: (error) => {
        if (isInferableError(error)) {
          // error.code / error.data are typed from the contract's .errors
          console.error(error.code, error.data)
        }
      },
    }),
  )
}
```

Rules:

- Put mutations in a module hook (`modules/<feature>/ui/hooks/use-*.ts`) when a
  section uses more than one, or the logic (optimistic update + invalidation) is
  non-trivial. Single, one-off mutations may live inline in the section.
- Always invalidate the smallest key set needed: `.key()` for the whole subtree,
  `.key({ input })` for one resource. Never invalidate the global query client.
- Handle errors with `isInferableError` so the typed contract errors surface.

### 5.5 Conditional queries with `skipToken`

For queries that only run once an input exists (search, selected id), use
`skipToken` instead of `enabled: false` — it's fully type-safe:

```tsx
import { skipToken } from '@tanstack/react-query'

const query = useQuery(
  orpc.applications.listMine.queryOptions({
    input: search ? { search, page: 1, limit: 20 } : skipToken,
  }),
)
```

### 5.6 Server functions / form actions (optional)

For **one-off actions** that don't participate in the query cache (e.g. login,
logout, a standalone export), the oRPC Next integration offers
`createServerFunction` / `createServerFormFunction` (`@orpc/next`) as an
alternative to TanStack mutations. Prefer TanStack mutations for anything that
mutates data the UI is already showing (so invalidation keeps it consistent).
`@orpc/next` is not yet installed; add it only when a concrete form-action need
arises.

---

## 6. When to create a component

Decision rules, in priority order:

1. **Is it reusable across modules?** → `components/` (chrome/empty/error) or
   `components/ui/` (primitives). Never put module-specific markup here.
2. **Does it own a data dependency (query/mutation)?** → it is a **section**.
   One section = one primary query (+ its mutations). If two unrelated queries are
   needed, split into two sections so they suspend independently and stream
   separately.
3. **Does it only arrange other components/sections and pass props?** → it is a
   **view** (Server Component). Keep it free of logic.
4. **Does it render data it received as props, with no fetching?** → it is a
   **component**. Extract whenever JSX repeats ≥ 3 times, or a chunk of a section
   grows past ~50 lines.
5. **Is it duplicated query/mutation wiring (hooks, invalidation)?** → module
   **hook** in `ui/hooks/`.

A "component should be its own file" when it is either reused, tested in
isolation, or large enough that a reader benefits from boundaries. A skeleton is
**not** its own file — it lives beside its section.

---

## 7. Cleanliness & maintenance rules

1. **One responsibility per file.** A file is either a section (fetch), a view
   (compose), a component (present), or a hook (logic).
2. **Skeletons colocate.** Every section exports `<Name>Skeleton` in the same
   file, used as its own Suspense fallback.
3. **Error states are first-class.** Wrap every section's Suspense child in an
   `ErrorBoundary` with a retry-capable fallback. Use a shared
   `components/error-state.tsx`; don't hand-roll per-section error markup.
4. **Type everything from schemas.** Component props use `z.infer<typeof XSchema>`
   from the module `schema.ts`, never hand-written interfaces that drift.
5. **No data fetching in views/layouts/components.** If you're tempted, the file
   is a section.
6. **`'use client'` only where needed.** Views stay server components. Push the
   client boundary as low as possible (into sections/components).
7. **Keep `app/**` pages thin.** Logic belongs in modules; a page should fit on
   one screen.
8. **Never import `server/` from `ui/`.** UI talks to the API only through
   `orpc` (query/mutation options) or server functions — never through
   `service.ts`/`repository.ts` directly.
9. **Auth/roles drive navigation, not data filtering in the UI.** The server
   enforces authorization via context/middleware; the UI fetches what it is
   allowed to and renders based on the current user (fetched via an `auth.me`
   procedure).
10. **Follow the existing code style** (2-space indent, no semicolons, single
    quotes, named exports for module components, default export only for
    `page`/`layout` route files).

---

## 8. Worked example — Applications module

Given the existing `modules/applications/{contract,schema,server}` backend, the UI
for the owner's application list and a detail page lands like this:

```
modules/applications/ui/
  views/
    applications-view.tsx          # Server Component, composes list section
    application-view.tsx           # Server Component, composes detail sections
  sections/
    application-list-section.tsx   # suspense infinite list
    application-detail-section.tsx # suspense single get
    application-status-section.tsx # status timeline (separate query -> separate section)
  components/
    application-card.tsx           # presentational card (props: ApplicationOutput)
    application-status-badge.tsx   # presentational badge (props: ApplicationStatus)
  hooks/
    use-application-mutations.ts   # submit/cancel/draft mutations + invalidation
```

**View (server):**

```tsx
// modules/applications/ui/views/applications-view.tsx
import { ApplicationListSection } from '../sections/application-list-section'

export function ApplicationsView() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Applications</h1>
      </header>
      <ApplicationListSection />
    </div>
  )
}
```

**Section (client):**

```tsx
// modules/applications/ui/sections/application-list-section.tsx
'use client'

import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'

import { orpc } from '@/lib/orpc-query'
import { ErrorState } from '@/components/error-state'
import { InfiniteScroll } from '@/components/infinite-scroll'
import { ApplicationCard, ApplicationCardSkeleton } from '../components/application-card'

const PAGE_SIZE = 20

export function ApplicationListSection() {
  return (
    <Suspense fallback={<ApplicationListSkeleton />}>
      <ErrorBoundary FallbackComponent={ErrorState}>
        <ApplicationListContent />
      </ErrorBoundary>
    </Suspense>
  )
}

export function ApplicationListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ApplicationCardSkeleton key={i} />
      ))}
    </div>
  )
}

function ApplicationListContent() {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      orpc.applications.listMine.infiniteOptions({
        input: (pageParam: number) => ({ page: pageParam, limit: PAGE_SIZE }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) =>
          lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
      }),
    )

  const items = data.pages.flatMap((page) => page.items)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((app) => (
        <ApplicationCard key={app.id} application={app} />
      ))}
      <InfiniteScroll
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </div>
  )
}
```

**Page (server, prefetch):**

```tsx
// app/(dashboard)/applications/page.tsx
import { dehydrate, HydrationBoundary } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc-query'
import { getQueryClient } from '@/lib/query-client.server'
import { dehydrateOptions } from '@/lib/query-client'
import { ApplicationsView } from '@/modules/applications/ui/views/applications-view'

const PAGE_SIZE = 20

export default async function Page() {
  const queryClient = getQueryClient()

  void queryClient.prefetchInfiniteQuery(
    orpc.applications.listMine.infiniteOptions({
      input: (pageParam: number) => ({ page: pageParam, limit: PAGE_SIZE }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    }),
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient, dehydrateOptions)}>
      <ApplicationsView />
    </HydrationBoundary>
  )
}
```

To reduce duplication, the list options (`PAGE_SIZE`, `getNextPageParam`) should
be extracted into a small helper module
(`modules/applications/ui/application-query-options.ts` or similar) shared by the
section and the page. Both must construct **identical** option objects so the
prefetched cache keys match the client query keys.

---

## 9. tRPC → oRPC migration map

For porting screens from the clone reference:

| Clone (tRPC) | This project (oRPC v2) |
| --- | --- |
| `src/trpc/init.ts` (`initTRPC`, procedures) | `modules/*/server/{router,service,repository}.ts` + `contract.ts` (already done) |
| `trpc.videos.getMany.useSuspenseInfiniteQuery(input, opts)` | `useSuspenseInfiniteQuery(orpc.videos.getMany.infiniteOptions({ input: pageParam => ..., ...opts }))` |
| `trpc.videos.getOne.useSuspenseQuery({ id })` | `useSuspenseQuery(orpc.videos.getOne.queryOptions({ input: { id } }))` |
| `trpc.videos.create.useMutation(opts)` | `useMutation(orpc.videos.create.mutationOptions(opts))` |
| `trpc.videos.getMany.prefetchInfinite(input)` | `void queryClient.prefetchInfiniteQuery(orpc.videos.getMany.infiniteOptions(...))` |
| `trpc.useUtils().x.y.invalidate(...)` | `queryClient.invalidateQueries({ queryKey: orpc.x.y.key({ input }) })` |
| `<HydrateClient>` | `<HydrationBoundary state={dehydrate(queryClient, dehydrateOptions)}>` |
| `superjson` serializer | default JSON (our outputs are already JSON-safe) |
| `ErrorBoundary` from `react-error-boundary` | same, keep using it |
| `src/components/infinite-scroll.tsx` | `components/infinite-scroll.tsx` (port as-is) |
| `src/hooks/use-intersection-observer.ts` | `hooks/use-intersection-observer.ts` (port as-is) |
| `src/constants.ts` (`DEFAULT_LIMIT`) | per-module const in `modules/<feature>/ui/` or `lib/constants.ts` |

The **structural** pattern (section/view/layout + suspense + skeleton + prefetch)
carries over unchanged; only the query/mutation API and hydration mechanism change.

---

## 10. Anti-patterns & gotchas

1. **Don't fetch in a view.** A view that calls `useSuspenseQuery` means the
   Suspense boundary is missing or misplaced — that file is a section.
2. **Don't `await` server prefetch.** `void queryClient.prefetchQuery(...)` keeps
   rendering streaming and non-blocking. Awaiting it serializes the page.
3. **Multiple `useSuspenseQuery` in one component run sequentially.** Put
   independent queries in sibling sections, or use `useSuspenseQueries`.
4. **Client context is excluded from query keys** by oRPC. If two queries differ
   only by client context, override the `queryKey` manually (see oRPC docs).
5. **Layouts don't re-render on navigation** — never read `searchParams` or
   `params` from a layout to drive data; do it in the page (or a client component
   with `useSearchParams`).
6. **Prefetch keys must match client keys.** The `infiniteOptions`/`queryOptions`
   objects in the page and the section must be byte-identical (share the helper).
7. **Don't import `server/` from `ui/`.** That leaks data-access code into the
   client bundle. UI only ever talks to `orpc`.
8. **Streamed/live queries block SSR** unless canceled on success. We use plain
   query/infinite for now; if streamed/live is added, follow the oRPC SSR
   guidance (`cancelStreamsOnSuccess`).
9. **Suspense boundary key.** When a section's query depends on a changing param,
   set `<Suspense key={param}>` so the fallback resets on change.
10. **Error boundaries must be Client Components** (or use
    `react-error-boundary`'s client-safe `ErrorBoundary` as we do).

---

## 11. Definition of done

A feature screen is complete when:

- [ ] `page.tsx` reads params and prefetches every query its view needs (non-blocking).
- [ ] `HydrationBoundary` wraps the view with `dehydrate(queryClient, dehydrateOptions)`.
- [ ] The view is a Server Component composing sections; no fetching, no `'use client'`.
- [ ] Each section owns one query, is wrapped in `<Suspense>` + `<ErrorBoundary>`,
      and ships a colocated skeleton.
- [ ] Components are presentational and typed from `schema.ts`.
- [ ] Mutations live in a hook and invalidate the smallest key set via `.key()`.
- [ ] No `server/` import from `ui/`; no `fetch` outside sections.
- [ ] `bun x tsc --noEmit` passes and `bun run lint` is clean.
- [ ] Skeleton → data → error → empty states are all reachable and intentional.
