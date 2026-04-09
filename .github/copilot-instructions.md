# SPL Stats Next.js Application - AI Coding Guide

## Project Overview

Next.js 16 app for Splinterlands portfolio statistics. Hive Keychain for auth, AES-256-GCM encrypted token storage, PostgreSQL via Prisma.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Material-UI v7
- **Backend**: Next.js Server Actions, Prisma ORM, PostgreSQL
- **Auth**: Hive Keychain (primary), NextAuth.js v5 for session management
- **Logging**: DB-backed logger (`Log` table via Prisma) with `console` fallback
- **State**: React Context + custom hooks
- **Deployment**: Docker with PostgreSQL

## Folder Structure (enforce strictly)

```
src/
  app/                        # Thin pages — layout + Suspense boundaries, no logic
  components/
    <page>/                   # Components specific to one page (e.g., components/users/)
    shared/                   # Reusable components used across pages
      skeletons/              # Default skeleton/loading components
  hooks/                      # ALL custom React hooks (even single-use — for separation)
  lib/
    backend/                  # Server-only code (never import in client components)
      actions/                # Next.js Server Actions — call db/ for data
      db/                     # SINGLE point of Prisma access, one file per entity
      auth/                   # Auth/encryption utilities
      log/                    # DB-backed logger (writes to Log table via db/logs.ts; console fallback)
    frontend/                 # Client-only code
      context/                # React context providers
      themes/                 # MUI theme config
    shared/                   # Safe for both server and client (no browser or Node APIs)
  types/
    <api>/                    # Types for 3rd-party APIs (e.g., types/spl/)
    <domain>/                 # Internal domain types, grouped by domain if needed
scripts/
  lib/                        # Script-dedicated utilities — NO Next.js runtime imports
                              # May import from src/lib/backend/ and src/lib/shared/
```

## Architecture Rules — ALWAYS follow these

### DB Layer (`lib/backend/db/`)

- **All Prisma access goes through `src/lib/backend/db/`** — never call Prisma directly in actions, components, or scripts.
- Organized by entity: `db/users.ts`, `db/monitored-accounts.ts`, etc.
- Exports plain `async` functions — no Next.js/Request/Response dependencies.

### Backend Actions (`lib/backend/actions/`)

- Server Actions callable from Client Components.
- Import from `lib/backend/db/` for all data operations.
- Never call Prisma directly inside action files.

### Frontend Data Flow

- Custom hooks in `src/hooks/` wrap Server Action calls.
- Create a hook even for single-use — code separation and maintainability.
- Hooks call Server Actions or public APIs only — never the DB layer directly.

### Pages (`app/`)

- Pages are thin: set layout, define Suspense boundaries, delegate to components.
- Default to Server Components; add `'use client'` only when interactivity or browser APIs are needed.
- Async data pattern: `<Suspense fallback={<SkeletonComponent />}><AsyncServerComponent /></Suspense>`.
- Pair every Suspense boundary with an error boundary (`components/shared/error-boundaries/`).

### Components

- Page-specific: `src/components/<page>/`
- Shared: `src/components/shared/`
- Skeletons: `src/components/shared/skeletons/`
- Add sub-folders when a group grows beyond ~3 files.

### DRY

- Extract duplicated logic into hooks, db functions, or shared utilities.
- No copy-paste logic across files.
- Avoid barrel (`index.ts`) files unless a folder has 4+ exports always imported together.

### Hydration

- Any component rendering an `<a>` tag or element with `href` must include `suppressHydrationWarning` — the Hive Keychain browser extension always mutates those DOM nodes causing React hydration mismatches.

### Types

- 3rd-party API types: `src/types/<api>/` (e.g., `src/types/spl/`)
- Internal types: `src/types/` or `src/types/<domain>/` when grouping helps.

### Caching

- Use Next.js `unstable_cache` (from `next/cache`) to cache DB query results — wrap inside `lib/backend/db/` functions when appropriate.
- Tag all cached queries with `revalidateTag`-compatible tags so mutations can invalidate precisely.
- Include the user ID in cache keys for user-specific data (e.g., monitored accounts).
- Pages that call `cookies()` or `headers()` are always dynamic (per-request) — cache the underlying data queries separately, not the page render.
- Aggressive caching is most valuable for external SPL API calls and shared game data (card catalogue, settings). User-specific data that mutates often can skip caching.

### Scripts (Cron / Background Jobs)

- Live in `scripts/` at the project root.
- Script-specific utilities in `scripts/lib/` — no Next.js runtime imports.
- May import from `src/lib/backend/` and `src/lib/shared/`.
- Run with `tsx` or `ts-node` — requires path alias support (`tsconfig-paths` or equivalent).

## Code Conventions

- Import alias: `@/` for all internal imports.
- Prisma singleton: `@/lib/prisma` (backend-only).
- Logger: `@/lib/backend/log/logger.server` (server-only). Writes to `Log` DB table; always echoes to `console` as fallback.
- All DB writes go through `lib/backend/db/`, never raw SQL.

## Themes

- Three modes: `light`, `dark`, `highContrast`.
- MUI `useColorScheme` / `setMode`, class-based ColorSchemeSelector.
- ThemeToggle cycles: light → dark → highContrast → light.

## Database

- Prisma client at `@/lib/prisma`
- Run migrations with `npx prisma migrate dev`
- Generate client with `npx prisma generate`

## Packages (as of March 2026)

- Next.js 16, React 19, MUI v7 (CSS vars / extendTheme), Prisma 7, NextAuth **v5** (beta.30).
- Prefer minor/patch upgrades; handle major bumps manually.
