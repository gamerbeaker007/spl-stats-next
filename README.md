# SPL Stats — Splinterlands Statistics Dashboard

A Next.js 16 application for tracking Splinterlands portfolio statistics across multiple accounts, with secure Hive Keychain authentication and AES-256-GCM encrypted token storage.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Material-UI v7
- **Backend**: Next.js Server Actions, Prisma ORM v7, PostgreSQL
- **Authentication**: Hive Keychain (browser extension) — cookie-based sessions with HMAC signing
- **Security**: AES-256-GCM encryption for SPL token storage

## Authentication

Users sign in with their Hive account via the Hive Keychain browser extension:

1. User enters their Hive username
2. Keychain signs `username + timestamp` with the posting key
3. Server validates the signature against the Hive blockchain (posting key lookup via `@hiveio/dhive`)
4. SPL token is fetched, encrypted (AES-256-GCM, random IV per token) and stored in the database
5. A signed session cookie (`spl_user_id`) is set — HMAC-signed with `COOKIE_SECRET` to prevent forgery

Only the posting key is used — no active key actions are possible through this app.

### Admin Access

`/admin` is restricted to usernames listed in `ADMIN_USERNAMES`. No separate login — admin users authenticate the same way as regular users. Access is checked server-side on every request.

### Monitored Accounts

After login a user must explicitly add monitored accounts via account management. Each monitored account has a stored SPL token that grants privileged API access:

- **One `SplAccount` row per Splinterlands username** — if multiple users monitor the same account, the token is stored once and shared. The first user to add the account provides the token; others link for free.
- **Dedicated ownership table** — `MonitoredAccount` records `(userId, splAccountId)`, so each user only sees their own set.
- **IDOR prevention** — all Server Actions that use tokens or return data for a given username first verify the caller has a `MonitoredAccount` row for that username. Passing someone else's username returns null / empty.
- **Re-authentication** — tokens can expire. Users can refresh via Keychain (`reAuthMonitoredAccount`), which requires: a fresh Hive signature (5-min replay window), the account to already be in the caller's monitored set, and verified posting-key ownership against the Hive blockchain.
- **Token removal** — removing a monitored account deletes the `SplAccount` token row only when no other user still monitors that username.

## Architecture

```
src/
  app/                          # Thin pages — layout + Suspense boundaries
  components/
    admin/                      # Admin page components
    side-bar/                   # Sidebar navigation
    top-bar/                    # TopBar + LoginComponent
    users/                      # Users page components
    shared/
      error-boundaries/         # Error boundary components
      skeletons/                # Loading skeleton components
  hooks/                        # ALL custom React hooks
  lib/
    backend/                    # Server-only code
      actions/                  # Next.js Server Actions
      api/spl/                  # Splinterlands API client
      auth/                     # admin.ts, cookie.ts, encryption.ts
      db/                       # Single point of Prisma access (one file per entity)
      log/                      # DB-backed logger
    frontend/
      context/                  # React context providers
      themes/                   # MUI theme
      keychain.ts               # Shared Hive Keychain signing utility
  types/spl/                    # Splinterlands API types
```

### Key Patterns

- **Server Components by default** — `'use client'` only when interactivity or browser APIs are needed
- **DB layer** — all Prisma calls in `lib/backend/db/`, never directly in actions or components
- **Hooks** — all Server Action calls wrapped in hooks in `src/hooks/`
- **Suspense pattern** — `<Suspense fallback={<Skeleton />}><AsyncServerComponent /></Suspense>` paired with error boundaries

## Security

- **AES-256-GCM** — authenticated encryption with random IV per token; auth tag stored separately; tampering is detected on decryption
- **HMAC-signed session cookie** — `COOKIE_SECRET`-keyed SHA-256 MAC; `timingSafeEqual` with length guard prevents timing attacks and malformed-cookie crashes
- **HTTP security headers** — CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'` set via `next.config.ts`
- **Per-action auth** — every privileged Server Action re-checks `getCurrentUser()` + ownership independently; page-level guards alone are not relied upon
- **IDOR prevention** — portfolio and player-token actions filter requested usernames to the caller's monitored set before any DB query
- **Replay prevention** — 5-minute timestamp window on all Hive signature checks
- **Body size limit** — Server Actions capped at 200 MB to prevent memory-exhaustion DoS (temporary first release only)
- **No secrets on the client** — `ENCRYPTION_KEY`, `COOKIE_SECRET`, `ADMIN_USERNAMES`, `DATABASE_URL` are accessed only in server-only files; no `NEXT_PUBLIC_` secrets exist

## Environment Variables

### Local development (`.env`)

```bash
# Database — direct connection string
DATABASE_URL="postgresql://user:pass@localhost:5432/splstats?schema=public"

# Encryption Key for AES-256-GCM token storage
# Recommended: openssl rand -hex 32  (produces 64-char hex, used directly as 32-byte key)
# Any other string also works — it will be SHA-256 hashed to 32 bytes
ENCRYPTION_KEY="64-char-hex-string"

# Cookie secret for HMAC-signing the session cookie
# Generate: openssl rand -hex 32
COOKIE_SECRET="64-char-hex-string"

# Admin — comma-separated Hive usernames with access to /admin
ADMIN_USERNAMES="yourusername"

# Battle Sync Accounts (optional)
# When not set: all monitored accounts have battle data synced and shown in the UI
# When set: only the listed accounts are synced by the worker; battles UI is restricted to them
# Accounts not in this list see a friendly "contact the admin" message instead of the battles UI
BATTLE_SYNC_ACCOUNTS=""

# Logging
LOG_DB="true"        # persist logs to DB (default when unset)
LOG_PRISMA="false"   # enable Prisma query log in dev only
```

### Docker deployment (`.env` fed into docker-compose)

Docker-compose constructs `DATABASE_URL` from the Postgres service variables:

```bash
POSTGRES_USER=splstats
POSTGRES_PASSWORD=change-me
POSTGRES_DB=splstats
# DATABASE_URL is assembled automatically — do not set it separately

ENCRYPTION_KEY=...   # mandatory — no default, container refuses to start without it
COOKIE_SECRET=...    # mandatory — no default, container refuses to start without it
ADMIN_USERNAMES=yourusername
BATTLE_SYNC_ACCOUNTS=   # leave empty for all accounts, or set comma-separated list
LOG_DB=true
# User-Agent sent to the Splinterlands API (optional — set this when self-hosting
# so your traffic is not identified as coming from spl-stats.com)
SPL_USER_AGENT="my-instance/1.0 (+https://my-site.example.com)"
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start database
docker-compose up -d

# 4. Run migrations and generate Prisma client
npx prisma migrate dev

# 5. Start dev server
npm run dev
```

## Database

```bash
npx prisma studio          # Visual DB browser
npx prisma migrate dev     # Create and apply a new migration
npx prisma generate        # Regenerate client after schema changes
```

## Worker Sync State

The worker uses `AccountSyncState` rows (one per `username + key`) to track progress across restarts. Field semantics:

| `key` | `lastSyncedCreatedDate` | `lastSeasonProcessed` |
| --- | --- | --- |
| `BALANCE_META` | Timestamp of last full balance run (skip-gate for daily / claim-trigger logic) | Latest completed season ID (detects new-season rollover) |
| `SPS`, `DEC`, `GLINT`, … | Date cursor — fetch transactions from this point forward | Not used — always `0` |
| `UNCLAIMED` | Cursor for unclaimed balance history | Not used — always `0` |
| `LEADERBOARD_WILD/MODERN/FOUNDATION` | Not used | Last season fetched — skips seasons ≤ this value |
| `PORTFOLIO` | Date of last successful snapshot — enforces once-per-UTC-day | Not used — always `0` |

`lastSeasonProcessed = 0` on per-token rows is expected — those rows only use the date cursor.

## Code Quality

```bash
npm run lint:fix    # ESLint auto-fix
npm run format      # Prettier
npm run format:all  # Prettier + ESLint + type-check
```

## Production Checklist

- [ ] Generate strong `ENCRYPTION_KEY` (`openssl rand -hex 32`)
- [ ] Generate strong `COOKIE_SECRET` (`openssl rand -hex 32`)
- [ ] Set `LOG_DB=true` (default when unset, but make it explicit)
- [ ] Set `ADMIN_USERNAMES` to your Hive username(s)
- [ ] Enable HTTPS (cookies use `secure: true` in production automatically)
- [ ] Set up database backups
- [ ] Configure rate limiting on auth endpoints if exposing to the public

## License

[Creative Commons Attribution-NonCommercial-ShareAlike 4.0](LICENSE) — free for personal/educational use, not for commercial use without permission.
