# Changelog

All notable changes are documented here.
Format: `## [vX.Y.Z] - YYYY-MM-DD` followed by categorized entries.

---

## [Unreleased]

---

## [v0.3.0] - 2026-04-15

### What's New

- **Card Stats page** — new section at `/card-stats` with three tabs:
  - **Distribution** — two charts: _Cards by Edition & Rarity_ and _Burned by Edition & Rarity_. Use the foil filter to show specific foil variants.
  - **Burned BCX** — detailed burned BCX analysis per edition and rarity with pivot table view.
  - **CP Analysis** — Collection Power breakdown by edition, rarity, and all five foil variants.
  - All tabs share a filter drawer: edition set, rarity, element, card type, and foil.
- **Foil filter redesigned** — the foil filter now covers all five foil variants with styled icon chips: Regular (gray card icon), Gold (gold card icon), GV / Gold Arcane (gold), Black (black card icon), BV / Black Arcane (black). Previously gold arcane was grouped with gold and black arcane with black; they are now separate filter options.
- **Foil filter added to Battles** — the battle filter drawer now includes a foil section (Regular / Gold) to filter card battle statistics by foil.
- **CP Analysis foil data** — all five foil variants (Regular, Gold, Gold Arcane GV, Black, Black Arcane BV) now appear individually in the _CP by Edition & Foil_ chart. Previously Gold Arcane was grouped under Gold and Black Arcane under Black; the underlying CP values were always correct.
- **Hive Blog — unclaimed season reward warning** — after generating a post, accounts that have no GLINT `season_rewards` entry in the database for the previous season now show a warning: _"Cannot find season rewards (Glint) for season X"_. This covers both the case where rewards haven't been claimed in Splinterlands yet and the case where the background worker hasn't picked them up yet.
- **Hive Blog — checkmark account selector** — the Accounts dropdown on the Hive Blog Generator now shows a checkbox next to each account, matching the style used on the Portfolio page.
- **Hive Blog — debug tooling** — a _Dry run_ checkbox skips the Keychain broadcast and logs the full payload to the browser console. A _Testnet mode_ checkbox routes the broadcast to `testnet.openhive.network` so posts can be tested without appearing on Hive mainnet.
- **Season Overview — hide current season** — a _Hide current season_ checkbox next to the account selector removes the in-progress season from all three tabs (Leaderboard, Earnings, Token Detail), preventing partial data from distorting charts.

### Fixed

- **Player Dashboard back button** — the Home button on `/multi-dashboard/collection` now navigates back to `/multi-dashboard` instead of the app root.

---

## [v0.2.2] - 2026-04-13

### Updates

- Updated docker base image version + CI action versions.
- Updated versions prisma to 7.7.0

### Fixed

- **Top bar alert clears after re-auth** — the invalid-token warning icon in the top bar now disappears immediately when a monitored account is successfully re-authenticated on the Users page. Previously it only refreshed on the next page load. Fixed by adding a `reAuthVersion` counter to `AuthContext` that `useReAuth` bumps on success; `InvalidTokenAlert` re-fetches whenever the counter changes.

---

## [v0.2.1] - 2026-04-12

### What's New

- **Admin log search** — added a debounced search bar to the Application Logs section.
- **Configurable User-Agent** — the User-Agent sent to the Splinterlands API is now controlled by the `SPL_USER_AGENT` env var. The fallback is the generic `spl-stats-instance/1.0` so self-hosters who forget to set it no longer have their traffic attributed to spl-stats.com. Set `SPL_USER_AGENT` in your `.env` to identify your own instance.

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
