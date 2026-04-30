# Changelog

All notable changes are documented here.
Format: `## [vX.Y.Z] - YYYY-MM-DD` followed by categorized entries.

---

## [Unreleased]

---

## [v1.0.0] -

### Summary

Major security and architecture improvement: replaced the legacy SPL session `token` with a short-lived **JWT** (`jwt_token`), separated authenticated vs. public SPL API calls into distinct modules, and migrated the worker from a fixed 30-minute sleep cycle to a per-account **queue-based** sync approach.

### Changed

#### JWT Migration

- **SPL accounts now store a JWT** instead of the legacy persistent session token. `addMonitoredAccountWithKeychain` and `reAuthMonitoredAccount` now read `jwt_token` + `jwt_expiration_dt` from the SPL login response and store the encrypted JWT in the existing `encryptedToken`/`iv`/`authTag` fields. All authenticated API requests use `Authorization: Bearer <jwtToken>`.
- **`SplAccount` schema extended** — two new nullable fields added:
  - `jwtExpiresAt` (`jwt_expires_at`) — stores the JWT expiry so token validity can be checked locally without an API call.
  - `lastWorkerSyncAt` (`last_worker_sync_at`) — tracks when the worker last processed this account, enabling the queue approach.
- **Token verification is now free** — `verifyMonitoredAccountToken` checks `jwtExpiresAt` directly; the legacy API-verify fallback is retained for accounts without an expiry date (migrated accounts).
- **Re-authentication queues an immediate resync** — `reAuthMonitoredAccount` now calls `resetSplAccountWorkerSync` after storing the new JWT, setting `lastWorkerSyncAt = null` so the worker picks up the account in its next check cycle.

#### API Module Split

- New module `src/lib/backend/api/spl/spl-authenticated-api.ts` contains all SPL API functions that require authentication (Bearer JWT):
  - `fetchBalanceHistoryPage`, `fetchUnclaimedBalanceHistoryPage`, `fetchBrawlDetails`, `fetchBattleHistory`, `fetchDailyProgress`, `fetchPlayerHistory`, `fetchPlayerHistoryByDateRange`, `fetchMarketHistoryByDateRange`, `verifySplJwt`
- `spl-api.ts` retains only public (unauthenticated) functions. `verifySplToken` removed entirely.
- All callers updated: `player-actions.ts`, `hive-blog-rewards.ts`, `hive-blog-market.ts`, `scripts/lib/balance-sync.ts`, `scripts/lib/battle-history-sync.ts`, `scripts/lib/service/balance-history.ts`, `scripts/lib/service/unclaimed-balance-history.ts`.

#### Worker Queue-Based Sync

- The worker no longer sleeps for a fixed 30 minutes between cycles. Instead it runs a **queue check every 60 seconds**:
  - `getAccountsDueForSync(cutoff)` queries accounts where `lastWorkerSyncAt` is null or older than 30 minutes, and whose JWT has not expired — no separate token verify call needed.
  - After processing each account, `updateSplAccountLastSync` sets `lastWorkerSyncAt = now`.
  - Public syncs (leaderboard, portfolio) still run on a 30-minute timer tracked in memory.
- New DB helpers: `getAccountsDueForSync`, `updateSplAccountLastSync`, `resetSplAccountWorkerSync`.
- Worker no longer calls `verifySplToken` — JWT expiry is pre-filtered in the DB query.
- New constants in `worker-config.ts`: `WORKER_CHECK_INTERVAL_MS` (60 s), `SYNC_INTERVAL_MS` (30 min).

#### Re-authenticate All

- `useMonitoredAccounts` hook gains `reAuthAllInvalid()` — iterates through all accounts with `tokenStatus === "invalid"` and calls `reAuthAccount` for each.
- **Users page** (`UserManagementContent`) shows a "Re-auth All Invalid (N)" button when one or more accounts have an expired token.
- **Multi-account dashboard** (`PlayerStatusDashboard`) has a persistent "Re-authenticate All" button that checks each account's token status then triggers Keychain re-auth for any expired ones.

### Database Migration

- `prisma/migrations/20260430000000_add_jwt_token_fields/migration.sql` — adds `jwt_expires_at` and `last_worker_sync_at` columns to `spl_accounts`.

---

## [v0.4.1] - 2026-04-24

### Changed

- **Worker splits account processing into two passes** — the cycle now runs two separate loops instead of one:
  1. **Token-dependent syncs** (`runTokenDependentSyncs`): balance history + battle history, only for accounts with a valid SPL token. Token verification still happens here; invalid tokens are marked and skipped.
  2. **Public syncs** (`runPublicSyncs`): leaderboard rankings + portfolio snapshots, for **all** monitored accounts regardless of token status. These endpoints are unauthenticated — accounts with an invalid or unknown token now continue to receive leaderboard and portfolio updates instead of being skipped entirely.
- Added `getDistinctMonitoredUsernames()` DB helper (`spl-accounts.ts`) that returns all monitored usernames without a token-status filter, used by the public sync pass.

### Fixed

- **Token invalidation no longer pollutes leaderboard/portfolio sync states** — when a token is detected as invalid, only the `BALANCE_META` sync state is marked `failed`. Previously all sync states were marked, causing leaderboard and portfolio states (which don't require a token) to show `{status: "completed", errorMessage: "Token invalidated"}` permanently, because `resetStaleSyncStates` skips `completed` rows and never cleared the stale message.
- **Re-authentication immediately clears the `BALANCE_META` error** — after a successful re-auth `clearBalanceMetaSyncError` resets `BALANCE_META` from `failed → pending` with `errorMessage: null`. Previously the error message lingered for up to 30 min until the next worker cycle called `resetStaleSyncStates`, causing a confusing mixed state (green token status, red sync status) in the UI.

---

## [v0.4.0] - 2026-04-23

### What's New

- **Unified card filter** — the three independent filter drawers (Dashboard, Battles, Card Stats) have been replaced by a single shared `UnifiedCardFilterDrawer` component. All pages now render the same filter UI from one source of truth, removing ~2 000 lines of duplicated drawer code.
- **Generic filter context factory** — a new `createFilterContext` utility generates a typed React context + provider from a set of defaults. All three filter contexts (`CardFilterContext`, `BattleFilterContext`, `CardStatsFilterContext`) are now thin wrappers produced by this factory, and each persists its state to `localStorage` automatically so filter selections survive page navigation.
- **Shared card-filter utilities** — `lib/shared/card-filter-utils.ts` centralises the Modern-edition preset, client-side `matchesFilter` logic, and a `clearAllFilterStorage` helper (called on logout to wipe all persisted filter state).
- **Hive Blog — action file split into services** — the single 900-line `hive-blog-actions.ts` file has been broken into focused service modules under `lib/backend/services/`: `hive-blog-earnings.ts`, `hive-blog-rewards.ts`, `hive-blog-tournaments.ts`, `hive-blog-markdown.ts`, and `hive-blog-icons.ts`. The action file now composes these services, making each concern independently readable and testable.

#### SeasonBalance earned/cost split

- **`SeasonBalance` model redesigned** — the single `amount` field (net sum, positive = earned, negative = spent) has been replaced by two separate fields: `earned` (sum of positive transaction amounts) and `cost` (sum of absolute negative transaction amounts). This preserves the breakdown for transaction types that have both positive and negative entries (e.g. `DEC market_purchase`), which was previously lost in the net sum.
- **Worker aggregation updated** — `aggregateItems()` in both `balance-history.ts` and `unclaimed-balance-history.ts` now splits amounts by sign into `earned`/`cost` instead of summing into a single `amount`. `incrementSeasonBalanceBatch()` increments the two fields independently.
- **Unclaimed delegation type keys cleaned up** — the `_to_<player>` suffix previously appended to the type key for delegation rows (e.g. `brawl_to_guildname`) has been removed. All delegations now aggregate into `cost` on the base type (`brawl`). The delegation target is no longer tracked.
- **Hive Blog earnings table fixed** — `buildEarningsSectionLines()` now merges earned and cost by `(token, label)` before rendering, so transaction types with both positive and negative amounts (e.g. `DEC market (buy/sell)`) appear as a single row with both columns filled instead of two separate rows.
- **DB migration** (`20260421000000_season_balance_earned_cost`) — adds `earned` and `cost` columns, drops `amount`, deletes all existing `season_balances` rows (data was invalid without the split), and resets balance/unclaimed `AccountSyncState` cursors to force a full worker re-sync. Runs automatically on `docker compose up` via `prisma migrate deploy`.

### Fixed

- Fix link to jackpot-prized-chests

---

## [v0.3.1] - 2026-04-19

### Fixed

- **survival_leaderboard_prizes** and **survival_bracket_rewards** part of spill over for glint (claimed in new season but are actual part of the previous one).. Manually fixed production DB for it.

## [v0.3.0] - 2026-04-18

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
- **Season Overview — hide current season** — a _Hide current season_ checkbox next to the account selector removes the in-progress season from all three tabs (Leaderboard, Earnings, Token Detail), preventing partial data from distorting charts.

### Fixed

- **Battle foil filter now works** — selecting a foil in the battle filter drawer now actually filters results. Previously the foil selection was stored in state but never passed to the database query, so all foils were always returned. Filtering now happens at the DB level before grouping.
- **Battle grouping split into two controls** — the single "Group card levels / foils" switch is replaced by two independent switches: _Group card levels_ and _Group card foils_. Previously ungrouped mode still silently merged foil variants because foil was not part of the grouping key; each flag now independently controls whether levels and foils are consolidated.
- **Dashboard collection foil filter now works** — selecting a foil on the collection page previously caused all cards to disappear. The `filterCard()` utility was checking foil but was never called with a foil value, so every card failed when a foil filter was active. Foil filtering is now handled separately at the card-group level where the foil information is actually available.
- **Battle foil tracking** — `PlayerBattleCard` and `OpponentBattleCard` now store a numeric `foil` field (0=Regular, 1=Gold, 2=Gold Arcane, 3=Black, 4=Black Arcane). Previously only a `gold: boolean` flag was recorded, making it impossible to distinguish Gold Arcane, Black, and Black Arcane foil types. A migration backfills existing rows: `gold=false` → `foil=0`, `gold=true` → `foil=1` (arcane/black information for older rows is lost). New imports from CSVs that include a `foil` column will record the precise foil; CSVs without a `foil` column fall back to the `gold` boolean. Battle stat filtering now uses the numeric foil directly.
- **Player Dashboard back button** — the Home button on `/multi-dashboard/collection` now navigates back to `/multi-dashboard` instead of the app root.
- **Database migration race condition** — `app` and `worker` both ran `prisma migrate deploy` simultaneously on startup, racing for PostgreSQL's advisory lock. If the lock wait timed out the `app` container failed without a restart policy, leaving it dead. A dedicated `migrate` init service now runs migrations exactly once before either service starts (`service_completed_successfully` dependency). Both entrypoint scripts no longer run migrations themselves.

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
