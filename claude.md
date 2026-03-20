# SPL Stats Next — AI Coding Preferences

## Project Context

Next.js 16 app for Splinterlands portfolio statistics. Authentication via Hive Keychain (custom), tokens encrypted with AES-256-GCM and stored in PostgreSQL.

## Decisions Made

### Security

- `ENCRYPTION_KEY` (AES-256-GCM for SPL tokens) and `COOKIE_SECRET` (HMAC signing for session cookie) are **separate** env variables — different cryptographic purposes, independent compromise surface.
- Encryption key derived via SHA-256 hash if not already 32-byte hex.
- Session cookie (`spl_user_id`) is HMAC-signed with `COOKIE_SECRET` to prevent forgery.

### Architecture

- Winston file logging replaced with a lightweight DB logger (`Log` Prisma table). Controlled by `LOG_DB` (write to DB) env vars.
- Hive Keychain is the sole auth mechanism. NextAuth was removed — cookie-based sessions with HMAC signing.

### Admin

- `/admin` page shows the application log viewer (queries the `Log` DB table).
- Access controlled by `ADMIN_USERNAMES` env var — comma-separated list of Hive usernames.
- No separate auth system: admin users log in via Hive Keychain like any other user; access is checked server-side on every request via `isAdmin(username)` in `lib/backend/auth/admin.ts`.
- The Admin link is always visible in the sidebar; non-admins see a "Access denied" error page.

### Monitor Accounts

- Login creates a `User` and an `SplAccount` (with encrypted token), but does **not** auto-add a `MonitoredAccount`. Users add accounts to monitor explicitly via the Users page (including their own).
- Users can remove any account from monitoring (stops data collection, does NOT log them out).
- Removing a monitored account deletes the `SplAccount` token if no other user monitors that same username.
- Future: when portfolio data tables are added, `removeMonitoredAccount` must check if other users also monitor the same username before deleting portfolio data.

### Themes

- Two themes: `light` and `dark`.
- Uses MUI v7 `extendTheme` with `colorSchemeSelector: "class"` and `InitColorSchemeScript` — no flicker on load, no custom context needed.
- ThemeToggle uses `useColorScheme` / `setMode` to toggle between light and dark.

## Folder Structure

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

## Architecture Rules

### DB Layer (`lib/backend/db/`)

- **Single point of DB interaction.** All Prisma calls go here — never directly in actions, components, or scripts.
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

## Packages (as of March 2026)

- Next.js 16, React 19, MUI v7 (CSS vars / extendTheme), Prisma 7.
- Prefer minor/patch upgrades; handle major bumps manually.

## TODO / Future Work

- Add portfolio data tables and hook up cascade delete in `removeMonitoredAccount`.
- Set up `tsx` / `tsconfig-paths` for scripts when first cron job is created.
- Add a cron job to prune old `Log` rows (`pruneLogs(days)` in `db/logs.ts`) — e.g. keep 30 days.
