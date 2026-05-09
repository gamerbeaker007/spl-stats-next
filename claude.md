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

- `ENCRYPTION_KEY` (AES-256-GCM for SPL JWT tokens) and `COOKIE_SECRET` (HMAC signing for session cookie) are **separate** env variables. Both are **mandatory** — no default fallback; the app throws on startup if either is missing.
- Encryption key: if 64-char hex use directly as 32-byte key; otherwise SHA-256 hash is used. Any string works (SHA-256 produces a valid 32-byte key), but the recommended form is `openssl rand -hex 32` (64-char hex) to use the direct path.
- **SPL tokens: JWT, not legacy session token** — `addMonitoredAccountWithKeychain` and `reAuthMonitoredAccount` store the `jwt_token` field from `SplLoginResponse` (not the legacy `token`). JWT expiry date (`jwt_expiration_dt`) is stored in `SplAccount.jwtExpiresAt` so token validity can be checked locally without an API call.
- All authenticated SPL API calls use `Authorization: Bearer <jwtToken>`. Authenticated functions live in `spl-authenticated-api.ts`; unauthenticated public API functions stay in `spl-api.ts`.
- Session cookie (`spl_user_id`) is HMAC-signed with `COOKIE_SECRET` to prevent forgery. `timingSafeEqual` with length guard to avoid throwing on malformed MACs.
- HTTP security headers set in `next.config.ts`: `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`.
- Server Action body limit: 50 MB (avoid memory-exhaustion DoS from oversized uploads).
- All privileged Server Actions verify auth independently: `getCurrentUser()` + ownership check per action — not just at page level.
- `reAuthMonitoredAccount` is guarded by: timestamp expiry (5 min), Hive signature verify, monitored-account ownership assert. After successful re-auth, calls `resetSplAccountWorkerSync` to queue the account for immediate re-sync.
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
- **Queue-based sync** — checks every 60 seconds (`WORKER_CHECK_INTERVAL_MS`) for accounts due for token-dependent sync. An account becomes eligible after 30 min since `lastWorkerSyncAt` (or immediately if `lastWorkerSyncAt = null`). `getAccountsDueForSync(cutoff)` filters out expired JWTs in the DB query — no separate API verify call.
- After processing each account, `updateSplAccountLastSync` stamps `lastWorkerSyncAt`. Re-authentication clears it via `resetSplAccountWorkerSync`, queuing the account for the next check cycle.
- Public syncs (leaderboard, portfolio) run on a 30-min in-memory timer (`WORKER_INTERVAL_MS`), independent of the queue.
- **Interruptible and resumable** via `AccountSyncState` (progress committed per season/token).
- Graceful shutdown on SIGTERM/SIGINT: finishes current account, then exits.
- Current flows: season balance collection + leaderboard sync (foundation/wild/modern) + battle history sync.
- `SeasonBalance`: pre-aggregated per `(username, seasonId, token, type)`. Two amount fields: `earned` (sum of positive transactions) and `cost` (sum of absolute negative transactions). `count` = number of transactions aggregated.
- Spillover transactions attributed to previous season.
- Unclaimed SPS/VOUCHER stored as `UNCLAIMED_SPS`, `UNCLAIMED_VOUCHER`.
- Unclaimed delegation rows (negative-to-other): aggregated into `cost` on the base type — delegation target is not stored. Old `_to_<player>` type-key encoding is gone.

### Hive Blog Generation

- `buildDetailedEarnings()` (`hive-blog-earnings.ts`): maps `SeasonBalance` rows to `earned[]` and `costs[]` arrays using `EARNINGS_LABELS` for human-readable labels. A single `(token, type)` can produce entries in both arrays if it has both positive and negative transactions (e.g. DEC market_purchase).
- `buildEarningsSectionLines()` (`hive-blog-markdown.ts`): merges earned/cost by `(token, label)` before rendering — types with both show as one table row with both columns filled instead of two separate rows.

#### `AccountSyncState` field semantics

| `key`                                | `lastSyncedCreatedDate`                                                                  | `lastSeasonProcessed`                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `BALANCE_META`                       | Timestamp of last full balance run — used as the skip-gate (daily / claim-trigger logic) | Last completed season ID — used to detect a new season rollover trigger |
| `SPS`, `DEC`, `GLINT`, … (per token) | Date cursor — "fetch transactions from this point forward"                               | Not used (always `0`)                                                   |
| `UNCLAIMED`                          | Cursor for unclaimed balance history                                                     | Not used (always `0`)                                                   |
| `LEADERBOARD_WILD/MODERN/FOUNDATION` | Not used                                                                                 | Last season whose leaderboard was fetched — skip seasons ≤ this         |
| `PORTFOLIO`                          | Date of the last successful portfolio snapshot — used to enforce once-per-UTC-day        | Not used (always `0`)                                                   |

> `lastSeasonProcessed = 0` on per-token rows is expected and harmless — those rows only use the date cursor. Only `BALANCE_META` and `LEADERBOARD_*` rows ever write a non-zero value here.

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
- Next release remove CSV import (security risk). Once removed, drop `bodySizeLimit` in `next.config.ts` `serverActions` from `"5mb"` to `"256kb"`. Also update nginx `client_max_body_size` to match.

### Future features
