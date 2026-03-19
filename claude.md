# SPL Stats Next — AI Coding Preferences

## Project Context

Next.js 16 app for Splinterlands portfolio statistics. Authentication via Hive Keychain (custom), tokens encrypted with AES-256-GCM and stored in PostgreSQL.

## Decisions Made

### Security

- Keep `NEXT_AUTH_SECRET` (NextAuth JWT signing) and `ENCRYPTION_KEY` (AES-256-GCM for SPL tokens) as **separate** env variables — different cryptographic purposes, independent compromise surface.
- Encryption key derived via SHA-256 hash if not already 32-byte hex.

### Architecture

- Admin logger view removed — it simplified the app. Winston backend logger kept (still writes to `logs/`) but no UI viewer.
- Hive Keychain is the primary auth mechanism (not NextAuth GitHub OAuth, which is a leftover scaffold — can be cleaned up later).

### Monitor Accounts

- When a user logs in, their own account is **automatically** added as a `MonitoredAccount` (so their own portfolio data is collected alongside any extra accounts they add).
- Users can remove their own account from monitoring (stops data collection, does NOT log them out).
- Future: when portfolio data tables are added, `removeMonitoredAccount` must check if other users also monitor the same username before deleting portfolio data. Only delete portfolio data if no other users share that monitored account.

### Themes

- Three themes: `light`, `dark`, `highContrast`.
- High contrast: pure black background, white text, yellow/cyan accents — WCAG AA/AAA.
- Theme stored via MUI `useColorScheme` / `setMode` (class-based ColorSchemeSelector).
- ThemeToggle cycles: light → dark → highContrast → light.

## Code Conventions

- Import alias: `@/` for all internal imports.
- Server actions in `src/lib/backend/actions/`.
- Prisma client at `@/lib/prisma`.
- Logger at `@/lib/backend/log/logger.server` (server-only).
- All DB writes go through Prisma, never raw SQL.

## Packages (as of March 2026)

- Next.js 16, React 19, MUI v7 (CSS vars / extendTheme), Prisma 7, NextAuth **v5** (beta.30).
- Prefer minor/patch upgrades; handle major bumps manually.

## TODO / Future Work

- Clean up `src/app/auth/signin/page.tsx` (still has old GitHub sign-in button — not used).
- Add portfolio data tables and hook up cascade delete in `removeMonitoredAccount`.
- Consider removing Winston / file logging if logs are never reviewed (or add a lightweight in-DB log).
