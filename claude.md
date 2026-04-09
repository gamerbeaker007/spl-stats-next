# SPL Stats Next — AI Coding Preferences

## Project Context

Next.js 16 app for Splinterlands portfolio statistics. Authentication via Hive Keychain (custom), tokens encrypted with AES-256-GCM and stored in PostgreSQL.

## Packages (as of April 2026)

- Next.js 16, React 19, Prisma 7
- **UI**: MUI v7 (`@mui/material`, `@mui/material-nextjs`) + emotion CSS-in-JS
- **Theming**: MUI `ThemeProvider` + `extendTheme` (3 themes: `light`, `dark`, `high-contrast`)
- **Icons**: `react-icons` (primary, `react-icons/md`)
- No shadcn/ui, no Tailwind, no next-themes

## Decisions Made

### Security

- `ENCRYPTION_KEY` (AES-256-GCM for SPL tokens) and `COOKIE_SECRET` (HMAC signing for session cookie) are **separate** env variables. Both are **mandatory** — no default fallback; the app throws on startup if either is missing.
- Encryption key: if 64-char hex use directly as 32-byte key; otherwise SHA-256 hash is used. Any string works (SHA-256 produces a valid 32-byte key), but the recommended form is `openssl rand -hex 32` (64-char hex) to use the direct path.
- Session cookie (`spl_user_id`) is HMAC-signed with `COOKIE_SECRET` to prevent forgery. `timingSafeEqual` with length guard to avoid throwing on malformed MACs.
- HTTP security headers set in `next.config.ts`: `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.
- Server Action body limit: 50 MB (avoid memory-exhaustion DoS from oversized uploads).
- All privileged Server Actions verify auth independently: `getCurrentUser()` + ownership check per action — not just at page level.
- `reAuthMonitoredAccount` is guarded by: timestamp expiry (5 min), Hive signature verify, monitored-account ownership assert.
- Portfolio actions (`getPortfolioOverviewAction`, `getPortfolioHistoryAction`) filter usernames to the caller's monitored set — prevents IDOR.
- Token-using actions (`getPlayerBrawl`, `getPlayersDailyProgress`) guarded by `assertMonitorsAccount(username)`.
- `getLogsAction` defaults to `limit=50`, capped at 500. Admin-only.

### Architecture

- DB logger (`Log` Prisma table), controlled by `LOG_DB` env var. Echoes to console as fallback.
- Hive Keychain is the sole auth mechanism — cookie-based sessions, no NextAuth.

### Admin

- `/admin` page: log viewer + worker status. Gated by `ADMIN_USERNAMES` env var (comma-separated Hive usernames).
- Auth checked server-side via `isAdmin(username)` in `lib/backend/auth/admin.ts`. Admin link always visible; non-admins get "Access denied".
- `getCurrentUser()` must run inside a `<Suspense>` boundary (Next.js 16 dynamic API requirement) — use `AdminGate` async Server Component pattern.

### Themes

- 3 themes: `light`, `dark`, `high-contrast` (`#0a0a0a` bg, `#90caf9` primary, `#f48fb1` secondary).
- MUI `extendTheme` only supports `light` and `dark` as scheme names. High-contrast is the `dark` scheme + a `high-contrast` class on `<html>`, which overrides MUI's generated CSS vars via the higher-specificity `.dark.high-contrast` selector in `globals.css`.
- `ThemeSetup` (`src/lib/frontend/context/ThemeSetup.tsx`): client component — FOUC script via `useServerInsertedHTML`, `ThemeProvider` wraps children, `ThemeContextBridge` exposes `useTheme()`.
- Storage key: `spl-theme` (`"light" | "dark" | "high-contrast"`). FOUC script syncs `mui-mode` from it.
- `ThemeToggle` cycles light → dark → high-contrast using `useTheme()` from `ThemeSetup`.
- `useReducer` force-update in `ThemeContextBridge` ensures re-render when high-contrast class changes without a MUI colorScheme change (dark → high-contrast is a no-op for MUI).

### Monitor Accounts

- Login creates `User` + `SplAccount` (encrypted token) but does **not** auto-add `MonitoredAccount`.
- Removing a monitored account deletes `SplAccount` token if no other user monitors that username.
- Future: cascade delete portfolio data in `removeMonitoredAccount`.

### Worker (Background Data Collection)

- Separate Docker service (`worker`), same image, `docker-entrypoint-worker.sh` entrypoint.
- Loop every ~30 min. If cycle exceeds 30 min, next starts immediately.
- **Interruptible and resumable** via `AccountSyncState` (progress committed per season/token).
- Graceful shutdown on SIGTERM/SIGINT: finishes current season, then exits.
- Current flows: season balance collection + leaderboard sync (foundation/wild/modern) + battle history sync.
- `SeasonBalance`: pre-aggregated per `(username, seasonId, token, type)`. Positive = earned, negative = spent.
- Spillover transactions attributed to previous season.
- Unclaimed SPS/VOUCHER stored as `UNCLAIMED_SPS`, `UNCLAIMED_VOUCHER`.
- `BATTLE_SYNC_ACCOUNTS` (env, optional, comma-separated): when **not set** → all monitored accounts get battle history synced and the UI shows all accounts in the filter. When **set** → only the listed accounts are synced by the worker AND the battles page filter is restricted to those accounts. If none of the user's monitored accounts appear in the list, a friendly "not on the list" alert is shown instead of the battles UI.

### Layout / Navigation

- Left sidebar: permanent (desktop, icon-only + tooltip when collapsed, icon+label when expanded) + temporary overlay (mobile).
- `NavShell` manages `expanded` (desktop) and `mobileOpen` (mobile) state. Sidebar is `fixed`; `<main>` gets dynamic `marginLeft` to avoid overlap.
- Top bar: hamburger (toggles sidebar on desktop / opens drawer on mobile) + logo + mobile nav icons (first 3) + theme toggle + user.
- `APP_BAR_HEIGHT = 64` exported from `TopBar.tsx`.

## Naming Conventions

| Thing                 | Convention              | Example                               |
| --------------------- | ----------------------- | ------------------------------------- |
| Folders               | kebab-case              | `multi-dashboard/`, `reward-history/` |
| React component files | PascalCase              | `TopBar.tsx`, `NavShell.tsx`          |
| Hook files            | camelCase, `use` prefix | `useMediaQuery.ts`                    |
| Lib / util files      | kebab-case              | `spl-api.ts`, `auth-actions.ts`       |
| Special markers       | dot-separated suffix    | `logger.server.ts`                    |

### Known deviations (do not replicate, fix when touched)

- `CAGoldRerwardCardDetail.tsx` — typo ("Rerward" should be "Reward")
- `src/lib/actions/` — root-level Server Actions (`jackpotCards.ts` etc.) violate the rule that all actions live in `lib/backend/actions/`
- `src/lib/staticsIconUrls.ts`, `lib/collectionUtils.ts`, `lib/rewardAggregator.ts` — at `lib/` root, not in `lib/frontend/` or `lib/shared/`
- `hooks/useCardDetails.ts` + `hooks/usePlayerHistory.ts` — duplicate root-level hooks; scoped versions already exist in `hooks/multi-account-dashboard/`

## Folder Structure

```
src/
  app/                          # Thin pages — layout + Suspense, no logic
    jackpot-prizes/             # Section with its own layout.tsx
    multi-dashboard/
    admin/ users/
  components/
    ui/                         # Shared UI primitives
    nav/                        # NavShell.tsx, navLinks.tsx
    side-bar/                   # SideBar.tsx
    top-bar/                    # TopBar.tsx, ThemeToggle.tsx, LoginComponent.tsx
    admin/ home/ users/         # Page-specific components
    jackpot-prizes/             # Includes ca-gold-rewards/ subfolder
    multi-dashboard/            # Includes dashboard/ reward-history/ reward-section/
    shared/
      error-boundaries/
  hooks/
    jackpot-prizes/             # Page-scoped hooks
    multi-account-dashboard/    # Page-scoped hooks
    useMediaQuery.ts            # (+ misc root-level hooks)
  lib/
    backend/                    # Server-only — never import in client components
      actions/                  # Server Actions — grouped by domain (jackpot-prizes/)
      api/                      # External API clients (spl/, peakmonsters/)
      auth/                     # Cookie, encryption, admin check
      db/                       # SINGLE Prisma access point, one file per entity
      log/                      # DB-backed logger
    frontend/                   # Client-only
      context/                  # AuthContext, ThemeProvider, CardFilterContext, etc.
    utils/                      # Shared utils (imageUtils, staticUrls)
    utils.ts                    # cn() + shared helpers (⚠ both file and folder exist)
    prisma.ts                   # Prisma singleton
    shared/                     # Safe for server + client
  types/
    spl/                        # SPL API types
    jackpot-prizes/             # Jackpot-prizes domain types
    peakmonsters/               # PeakMonsters API types
    *.ts                        # Root-level internal types
scripts/
  worker.ts                     # Worker entry point
  lib/                          # Worker utilities (no Next.js imports)
```

## Architecture Rules

### DB Layer (`lib/backend/db/`)

- **Single point of DB interaction.** Prisma never called directly in actions, components, or scripts.
- One file per entity: `users.ts`, `spl-accounts.ts`, etc.
- Exports plain `async` functions — no Next.js/Request/Response.

### Backend Actions (`lib/backend/actions/`)

- Server Actions callable from Client Components.
- Import from `lib/backend/db/` only — never raw Prisma.

### Frontend Data Flow

- Hooks in `src/hooks/` wrap Server Actions. Create a hook even for single-use.
- Hooks → Server Actions or public APIs only. Never DB layer directly.

### Pages (`app/`)

- Thin: layout + Suspense boundaries + delegate to components.
- Default to Server Components; `"use client"` only for interactivity/browser APIs.
- Pattern: `<Suspense fallback={<Skeleton />}><AsyncServerComponent /></Suspense>`.
- Pair every Suspense with a `PageErrorBoundary`.

### Components

- MUI primitives used directly (Box, Typography, Button, etc.) — no local wrapper layer.
- Page-specific: `src/components/<page>/`.
- Shared: `src/components/shared/`.
- Sub-folders when a group grows beyond ~3 files.

### DRY

- Extract duplicated logic into hooks, db functions, or shared utilities.
- No copy-paste logic across files.
- No barrel (`index.ts`) files unless 4+ exports always imported together.

### Hydration

- Any `<a>` or element with `href` needs `suppressHydrationWarning` — Hive Keychain extension mutates those nodes.

### Styling

- MUI `sx` prop for component styling, inline `style` for layout adjustments.
- Theme tokens via `theme.palette.*` — primary, secondary, background, text.
- Responsive via MUI `sx={{ display: { xs: "flex", md: "none" } }}` or `useMediaQuery` hook when needed.

## Code Conventions

- Import alias: `@/` for all internal imports.
- Prisma singleton: `@/lib/prisma` (backend-only).
- Logger: `@/lib/backend/log/logger.server` (server-only).
- All DB writes through `lib/backend/db/`, never raw SQL.

## TODO / Future Work

### Cleanup (fix when touched, not production-blockers)

- Fix `lib/actions/` root-level actions → move to `lib/backend/actions/`.
- Fix `lib/staticsIconUrls.ts`, `collectionUtils.ts`, `rewardAggregator.ts` → move to correct location.
- Deduplicate `hooks/useCardDetails.ts` and `hooks/usePlayerHistory.ts` (scoped versions exist).
- Rename `CAGoldRerwardCardDetail.tsx` → `CAGoldRewardCardDetail.tsx`.
- Cascade delete portfolio data in `removeMonitoredAccount` (currently only removes the monitored account row; old portfolio snapshots/investments stay in DB orphaned).
- Next release remove csv import only the first version should support this sewcurity risk with the 200mb

### Future features
