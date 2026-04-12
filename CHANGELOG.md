# Changelog

All notable changes are documented here.
Format: `## [vX.Y.Z] - YYYY-MM-DD` followed by categorized entries.

---

## [Unreleased]

---

## [v0.2.1] - 2026-04-12

### What's New

- **Admin log search** — added a debounced search bar to the Application Logs section.

### Fixed

- **Worker sync state stuck on "pending"** — after `resetStaleSyncStates()` resets an interrupted sync back to "pending", subsequent runs that had nothing new to do would leave it there indefinitely. Two cases fixed:
  - **Leaderboard**: when `buildSeasonsToProcess` returns nothing (all seasons already processed), the sync state is now explicitly marked "completed" instead of being skipped.
  - **Portfolio**: when the daily check finds the portfolio was already synced today, the sync state is now explicitly marked "completed" instead of just returning early.

---

## [v0.2.0] - 2026-04-10

### What's New

- **Balance sync optimisation** — the worker no longer re-fetches all 11 token types every 30 minutes for accounts that are already up to date. Syncs now only run when a trigger fires: first sync (always), season rollover (new completed season detected), daily refresh (24 h since last run), or claim detection (a `league_season` reward was claimed after the last sync, catching GLINT/token spillover). A single lightweight API call is made for the claim check; everything else is a free in-memory comparison. The first-time scan behaviour is unchanged.
- Improve Retry logging
- Improve worker sync (validate spl token before starting)
- **SPL Metrics page** — game-wide metrics dashboard with four chart tabs: Battle Metrics, Card Market, User Metrics, and Transactions. Includes a period selector (7 days → All time) and a join-date overlay: enable "Show join dates" to see your monitored accounts' join dates as vertical lines on every chart. Additional accounts can be added as chips and removed at any time.

#### Fixed

- GitHub release workflow: changelog section was rendered as literal

---

## [v0.1.0] - 2026-04-09

### What's New

- Initial release
- Docker setup with release notes
- Multi-account dashboard site migrated
- Jackpot prizes site migrated
- Portfolio tracking
- Hive Keychain authentication with HMAC-signed session cookies
- AES-256-GCM encrypted SPL token storage per account
- Season balance collection worker (SPS, VOUCHER, Credits, DEC, etc.)
- Leaderboard sync (Foundation / Wild / Modern)
- Admin page with worker status, DB size, and log viewer
- Battle Statistics
- Battle import, portfolio import, and investment import tools
- Three UI themes: Light, Dark, High-Contrast
- Persistent left sidebar navigation (desktop) + mobile drawer
