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
3. Server validates the signature with the Splinterlands API (`/players/v2/login`)
4. SPL token is encrypted (AES-256-GCM, random IV per token) and stored in the database
5. A signed session cookie (`spl_user_id`) is set — HMAC-signed with `COOKIE_SECRET` to prevent forgery

Only the posting key is used — no active key actions are possible through this app.

### Admin Access

`/admin` is restricted to usernames listed in `ADMIN_USERNAMES`. No separate login — admin users authenticate the same way as regular users. Access is checked server-side on every request.

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

## Token Security

SPL tokens grant full Splinterlands API access. They are encrypted at rest:

- **Algorithm**: AES-256-GCM (authenticated encryption — detects tampering)
- **IV**: Random 16 bytes per token (prevents pattern analysis)
- **Storage**: `encryptedToken`, `iv`, `authTag` stored separately in `SplAccount` table
- **Decryption**: Server-side only, on-demand for API calls — never sent to the client

A single `SplAccount` row is shared across all users monitoring that username, so the token is stored once even if multiple users monitor the same account.

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/splstats"

# Encryption Key for AES-256-GCM token storage (generate: openssl rand -hex 32)
ENCRYPTION_KEY="64-char-hex-string"

# Cookie Secret for HMAC-signing the session cookie (generate: openssl rand -hex 32)
COOKIE_SECRET="64-char-hex-string"

# Admin — comma-separated Hive usernames with access to /admin
ADMIN_USERNAMES="yourusername"

# Logging
LOG_DB="true"       # persist logs to DB (recommended in production)
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

## Code Quality

```bash
npm run lint:fix    # ESLint auto-fix
npm run format      # Prettier
npm run format:all  # Prettier + ESLint + type-check
```

## Production Checklist

- [ ] Generate strong `ENCRYPTION_KEY` (`openssl rand -hex 32`)
- [ ] Generate strong `COOKIE_SECRET` (`openssl rand -hex 32`)
- [ ] Set `LOG_DB=true`
- [ ] Set `ADMIN_USERNAMES` to your Hive username(s)
- [ ] Enable HTTPS (cookies use `secure: true` in production automatically)
- [ ] Set up database backups
- [ ] Configure rate limiting on auth endpoints

## License

[Creative Commons Attribution-NonCommercial-ShareAlike 4.0](LICENSE) — free for personal/educational use, not for commercial use without permission.
