# Changelog

All notable changes are documented here.
Format: `## [vX.Y.Z] - YYYY-MM-DD` followed by categorized entries.

---

## [Unreleased]

---

## [v1.9.4] - 2026-07-17

### Fixed

- **Hive blog generation** Make title editable.


---

## [v1.9.3] - 2026-07-17

### Fixed

- Untamed promos minted with the legacy `tier=3` (Halfling Alchemist, Mighty Dricken) are now grouped, filtered and displayed as **Untamed** instead of falling through the filter. Their combine rates still resolve to legacy beta rates (the one intended exception).

---

## [v1.9.2] - 2026-07-16

### Fixed

- **Buy Missing CC** Sorting on 1 CC and Next Bracket.
- Fixed combine rates for alpha promo >=0 iso > 0


---

## [v1.9.1] - 2026-07-16

### Added

- **Buy Missing CC** Add warning when not the exact match (CC) is found on the market. potentially overbuying CC.

---

## [v1.9.0] - 2026-07-14

### Added

- Added new marketplace pages for trading assets on the selected account, reusing the existing marketplace components (live lowest prices, owned/listed status, name/price sorting, USD min/max and "listed only" filters, and transaction verification):
  - **Packs** — with a set-based filter (select one or more sets such as Chaos Legion to query all corresponding marketplace pack editions), using the existing set icons and names.
  - **Titles** — displays each title's description prominently.
  - **Consumables**.
  - **Collector Stickers**.
  - **Totems** — complete totems and totem fragments shown as two labelled sections on one page.
  - **Land** — land plots, deeds, and land resources (e.g. Time Crystals) shown as labelled sections on one page.
- Added collection sub-navigation entries for the new marketplace pages.
- Added a card/table layout toggle to all marketplace pages; the preference is remembered per user (localStorage). In table layout, skins show as flat rows without the base-card grouping.
- Supported buy, list, transfer, and delist across the new marketplace pages according to each asset's ownership model:
  - Instance/uid assets (titles, complete totems, collector stickers, deeds) list and transfer specific owned copies (per uid).
  - Fungible/quantity assets (packs, consumables, totem fragments, land resources, land) list and transfer by quantity — listing via `sm_marketplace_list` and transferring via `sm_token_transfer`.
- Added active skin and the possibility to change it in the marketplace pages.

### Changed

- Marketplace asset detail ids may now be non-numeric (e.g. pack `CHAOS`, consumable `MIDNIGHTPOT`, land resource `TC`); id parsing no longer throws on string ids, and owned-copy lookups match detail ids as strings.
- Generalized the marketplace list/transfer flow to route by asset ownership model (instance / skin / quantity) instead of skins-vs-music, so all asset types reuse the same dialogs.
- Consolidated the set → marketplace pack mapping into `edition-utils` (`SetDef.marketPackDetailIds`) so editions, sets, and their pack codes are maintained in one place.

### Fixed

- Fixed combine status not refreshing after a successful combine. Both the target-level combine flow and the Buy Missing CC combine dialog now invalidate the cached collection/balances before reloading, so the enabled/disabled combine state is recalculated against the post-combine collection instead of a stale cached snapshot.

---

## [v1.8.0] - 2026-07-13

### Added

- Added a new **Music** collection page with marketplace support, including owned/listed status, live lowest prices, and buy, list, transfer, and delist actions.
- Added a new **Skins** collection page with grouped skin ownership, marketplace support, transaction verification, and grouped/flat view modes.
- Added collection sub-navigation to all `/collection` pages for quick switching between Cards, Buy Missing CC, Skins, and Music.
- Redesigned the `/collection` landing page with icon-based navigation cards.
- Added marketplace filter controls for skins and music:
  - Name and price sorting
  - USD minimum/maximum price filters
  - "Listed only" filter
- Added transaction progress and automatic verification for all marketplace actions.
- Added paginated ownership selection (5 items per page) for listing and transferring individual assets, showing unavailable copies while preventing invalid selections.
- Added support for cancelling marketplace listings directly from the listing dialog.
- Added the shared top balances bar to the Skins and Music pages.
- Added support for ETN and EVP in multiaccount dashboard

### Changed

- Top balances now display skeleton placeholders while refreshing instead of a loading spinner.

### Fixed

- Improved combine-card validation by checking overall eligibility before evaluating land restrictions, resulting in more accurate tooltips.


## [v1.7.2] - 2026-07-12

### Changed

- When you do not own any copies the combine button is also disabled
- Fix filter Upgradeable Card

## [v1.7.1] - 2026-07-12

### Changed

- Combine validation now treats cards with `stake_ref_uid != null` as unavailable for combining and reports a new `on-land` disabled reason with the same orange warning treatment as wagon-blocked levels and buttons.

---

## [v1.7.0] - 2026-07-11

### Added

- **Combine Cards feature (Feature C)** — players can now combine cards directly from the collection pages.
  - **`CombineCardsDialog`** — new dialog showing a current → target card preview, animated arrow during processing, a level selector (color-coded: green = reachable, orange = blocked by wagon, disabled = not enough BCX), a new-abilities preview, and a `PurchaseTxProgressPanel` for broadcast/verify feedback.
  - **Combine column in Buy Missing CC table** — combine button enabled only when the card can actually be upgraded; tooltip explains the first blocking reason (`max-level`, `not-enough-copies`, `in-set`, `on-wagon`, `delegated-out`).
  - **Combine column in BuyCardDialog target-level tab** — per-level combine button with spinner during processing, reuses `checkCombineStatus` validation.
  - **"Upgradeable Cards" filter toggle** on Buy Missing CC — hides cards whose combine button is disabled, making it easy to find immediately combinable cards.
  - **`broadcastCombineCards`** in `splBroadcast.ts` — broadcasts `sm_combine_cards` custom-JSON via Hive Keychain active key.
  - **`checkCombineStatus` / `getCombineTooltipText`** shared functions in `buy-missing-cc.ts` — single source of validation for all combine entry points.

### Changed

- **`PurchaseTxProgressPanel`** refactored to a unified `status: "processing" | "verified" | "error"` model with `CircularProgress` spinner, `MdCheckCircle` success indicator, Hivehub.dev tx link, and inline error `Alert`; `buyBusy` prop removed.
- **`TargetLevelTabContent`** props split into `view` and `actions` objects; `onCombineAtLevel` added to `actions`.
- **`ManualListingsTabContent`** state mutators moved to an `actions` object passed as a single prop.
- **`CardDetail`** type gains `onWagon: boolean` and `inSet: boolean` fields; `name` field removed (already available on the parent `DetailedPlayerCardCollectionItem`).
- **Buy Missing CC table** gains a separate **`1 CC $`** column (lowest price for a single copy) and **`Price CC $`** column (lowest price per BCX), both sortable. Column header tooltips added.
- **`lowPriceUsd`** added to `Row` type (lowest price for one copy); cost estimate fields updated to use it instead of `lowPricePerBcxUsd`.
- `BuyMissingCcSortField` extended with `"cc"` and `"1bcx"` sort options.
- Purchase-cart progress panel replaced with `PurchaseTxProgressPanel`; duplicate error alert suppressed when progress already shows the error.
- Estimate formula label updated to "Lowest Price for 1 CC" for clarity.

---

## [v1.6.0] - 2026-07-10

### Added

- **Cross-Foil Progress** toggle on Buy Missing CC — combines foils of the same card and evaluates progress from owned-foil data, with a **Highest Level Only** option that keeps the foil whose highest owned copy has the highest level.
- Sticky collection sub-bar (balances + cart) that pins below the app bar on desktop.

### Changed

- Buy Missing CC table extracted into its own component and now fills the viewport height on desktop, scrolling internally instead of adding a second scrollbar on the page.
- `ScrollableTableContainer` now accepts a `minHeight` and responsive `maxHeight` to support fill-height layouts.
- `BuyCardDialog` shows the per-account balance in the actions bar, offsets below the sticky bars, and renders a condensed icon+tooltip card details summary.
- Active foil filter chip now shows a highlighted border.

### Fixed

- Bracket status **All** toggle now resets any specific-bracket selection instead of doing nothing.
- Buy Missing CC layout fixes so the table stays within the page and the bracket filter can be cleared.
- Card filters no longer cause a React hydration mismatch — persisted filter state (foil, edition, etc.) is now loaded after mount instead of during the first render, so server and client HTML match. Fixes all filter contexts (Battle, Card, Card Stats, Buy Missing CC).
- Card collection and ownership now refresh after a successful purchase. `BuyCardDialog` (both target-level and manual-listings modes) and the cart checkout dialog now reload the dialog's own ownership/target-level rows plus the underlying pages (Buy Missing CC table and `/collection/cards` grid) once the transaction is verified, instead of showing stale data.

---
## [v1.5.0] - 2026-07-06

### Added

- **Collection buying hub** with `/collection`, `/collection/cards`, and `/collection/buy-missing-cc` routes under the Cards navigation.
- **Buy from collection flow (Feature A)** on `/collection/cards`, letting users open market listings for a collection card, select individual listings, add them to a purchase plan, or buy directly.
- **Buy Missing CC planner (Feature B)** on `/collection/buy-missing-cc`, including account selection, shared card filters, bracket filters, owned/unowned card rows, bracket status, pagination, search, and estimated upgrade costs.
- **Reusable `BuyCardDialog`** with `manual-listings` and `target-level` tabs. Manual mode supports listing fetch, foil + level filters, row/range selection, pagination, totals, and cart markers. Target-level mode previews target levels, missing CC, stats, abilities, and exact listing plans.
- **Shared purchase plan/cart infrastructure** (`PurchasePlanContext`) with dedupe by `account + marketId`, multi-account grouping, global top-bar cart badge, removable cart rows, and checkout dialog.
- **Direct account-signed market purchases** via Hive Keychain Active key using `sm_market_purchase` custom-json, with DEC and CREDITS support.
- **Transaction verification polling** via the new `lookupTransaction` parser and `waitForTransactionsAction`, removing completed cart rows only after successful transaction confirmation.
- **Top-bar balance summary** for CREDITS, DEC, and SPS with per-account hover details.
- **Reusable account selector and scrollable table components** used by the collection-buying pages.
- **Storybook setup and ability icon story** for the Buy Missing CC ability display.

### Changed

- Collection links now point to `/collection/cards` from multi-dashboard entry points.
- SPL API clients now share centralized environment-aware config in `splApiConfig` (public/auth/vapi base URLs, app id, operation prefix).
- Card foil handling in the collection-buying flow now uses the `CardFoil` domain type in app/UI code and converts to numeric `0-4` values only at SPL API boundaries.
- Card image, foil label, and buy-missing-CC calculation helpers are centralized in shared utilities.
- Buy Missing CC excludes SoulKeep cards from the playable purchase/upgrade list.

### Fixed

- Market transaction lookup handling now supports raw `/transactions/lookup` payload wrappers consistently (including existing hive-blog market lookup usage).
- Buy Missing CC filter state now has its own storage key, and Modern/Wild/set toggles apply atomically so the first filter click works after page load.
- Added accounts on Buy Missing CC now correctly match owned cards by `card_detail_id + edition + CardFoil` instead of treating all cards as missing.
- `BuyCardDialog` target-level mode now uses resolved card stats/rarity consistently, handles max-only foil levels correctly, and enables purchase actions only when the target can be fulfilled.
- Alpha/Beta gold combine-rate calculations now respect the first obtainable gold level from the settings XP tables.
- Adding a listing from the dialog's manual-listings tab no longer closes the dialog unexpectedly.
- Account selector local-storage hydration no longer causes React hydration mismatches.
- Buy Missing CC table width now stays inside the page layout and scrolls inside `ScrollableTableContainer`.

---

## [v1.4.1] - 2026-06-30

### Fix

- Fix loading intial account for fortune winners


---

## [v1.4.0] - 2026-06-30

### Added

- **Fortune Winners page** (`/jackpot-prizes/fortune-winners`) — all-time top-ten ranked & frontier draw winners, plus an account search list to look up the cards specific players have won. Logging in while on the page resets the search list to your monitored accounts; logging out clears it.
- **`FortuneWinner` model / `fortune_winners` table** (migration `add_fortune_draw_winners`) storing verified ranked & frontier fortune-draw results.
- **Worker fortune-draw sync** — `updateRankedDrawWinners` / `updateFrontierDrawWinners` reproduce the official Splinterlands draw verifier (`generateFortuneDraw`) and persist winners on the 30-min public-sync cycle.
- **SPL fortune-draw API helpers** in `spl-api.ts` (`fetchCompletedFrontierDraws`, `fetchCompletedRankedDraws`, draw entries & available prizes).
- Add Verico as Edition Set

### Changed

- **SPL API base URL** switched from `api2.splinterlands.com` to `api.splinterlands.com` (v1) for all calls; the separate `splV1Client` is removed. Prepares for a future test environment that does not serve `api2`.
- **`getFortuneWinnersAction` / `getTopFortuneWinnersAction`** server actions wrapping the `fortune-winners` DB layer.

### Fixed

- **Multi-dashboard card collection** — cards printed in multiple editions (e.g. Alpha + Beta) now show a separate slot per edition. Previously `getDetailedPlayerCardCollection` keyed each card by `card_detail_id` only and took the edition from `distribution[0]`, so a missing card displayed just one of its editions. It now expands each card into one entry per edition from the `editions` field.
- **Card collection: missing cards now show when a foil filter is active.** Previously, selecting any foil (e.g. Gold, Black) hid all "Missing" placeholders. Now a missing placeholder is shown when you own none of the selected foils, and is suppressed only when the card was never printed in any of the selected foils for that edition (e.g. an Alpha card is no longer flagged as a missing Black foil, while its Beta variant still can be). Added per-edition `availableFoils` to `DetailedPlayerCardCollectionItem`, derived from the API card distribution.

---

## [v1.3.2] - 2026-06-03

### Added

- **Minor Jackpot Skins** — new section on the Jackpot Prizes Chests page showing skins from the `$MINOR_JACKPOT_SKINS` account (Minor chest, 0.05% odds).
- **`fetchAccountSkins(username)`** in `spl-api.ts` — generic helper for `/players/skins`; `fetchJackPotSkins` and `fetchMinorJackpotSkins` delegate to it (same pattern as `fetchAccountCardCollection`).
- **`getMinorJackpotSkins()`** server action in `jackpotSkins.ts`.

---

## [v1.3.1] - 2026-05-27

- Fix jackpot prizes seprate ETN and reward chest
- Added info on chances

## [v1.3.0] - 2026-05-27

### Added

- **`fetchAccountCardCollection(username)`** in `spl-api.ts` — generic function for fetching card collections from named SPL accounts (`$FRONTIER_JACKPOT`, `$JACKPOT`, `$ETN_REWARD_FOILS`, etc.). `fetchFrontierJackpotCollection` and `fetchJackpotCards` now delegate to it.
- **Generic `getAccountBucket(username)`** action (`accountBucket.ts`) — replaces the per-account bucket actions; cache key automatically scoped per account.
- **Generic `getEditionTierCards(edition, tier)`** action (`editionTierCards.ts`) — replaces per-tier card actions; fetches mint history for any edition × tier combination.
- **`BucketServer({ username })`** server component — renders a `FrontierBucketOverview` for any named account bucket.
- **`EditionTierCardsServer({ edition, tier, title, subtitle, recentWinnersLabel })`** server component — renders a `ClientCardGrid` for any edition × tier combination.
- **ETN bucket + Tier 14 cards on Jackpot Prizes Chests page** — `$JACKPOT` and `$ETN_REWARD_FOILS` bucket overviews plus Edition 17 Tier 14 card grid added to the "Jackpot Card Data" section.

---

## [v1.2.0] - 2026-05-25

### Added

- **Frontier Extra Rewards page** (`/jackpot-prizes/frontier-extra-rewards`) — Edition 17 Tier 15 special cards with real per-card `mint_history` data; nav entry added.
- **Frontier Jackpot bucket overview** — compact card grid at the top of the page showing NFTs remaining in the `$FRONTIER_JACKPOT` account, grouped per card × foil with a per-minute cache.
- **Multi-edition recent winners carousels** (`MultiRecentWinnersSection`) — renders multiple `RecentWinnersCarousel` instances with optional tier filtering; used on Frontier Reward Draws and Jackpot Prizes Chests pages. `ClientCardGrid` gains a `recentWinnersConfigs` prop as the multi-edition alternative to `showRecentWinnersForEdition`.

### Fixed

- **Black Foil shows `minted/total` on Edition 17 cards** — `Card.tsx` now includes edition 17 in the `showFullStats` condition (e.g. `30/150` instead of `150`).

---

## [v1.1.0] - 2026-05-24

### Changed

- **`fetchMintHistory` split into two functions** — the overloaded signature (with a dummy `cardDetailId: 0` when calling in by-date mode) has been replaced by two focused functions:
  - `fetchMintHistory(foil, cardDetailId)` — fetches mint history for a specific card, returns `MintHistoryResponse`.
  - `fetchMintHistoryByDate(foil, edition?)` — fetches recent winners sorted by date, returns `MintHistoryByDateItem[]`.
  - Caller in `mintHistory.ts` (`getRecentWinnersAction`) updated to use `fetchMintHistoryByDate` directly.

### Fixed

- **Stale error message persists after successful re-sync** — a per-token sync state row could end up as `{ status: "completed", errorMessage: "Request failed with status code 503" }` if the worker retried successfully _before_ the user re-authenticated (success path only wrote `status: "completed"`, never cleared `errorMessage`). `resetSyncStatesOnReAuth` only targets `status: "failed"` rows, so the stale message survived indefinitely. Fixed in `updateSyncState`: when `status: "completed"` is set and `errorMessage` is not explicitly provided, it is automatically cleared to `null`.

---

## [v1.0.0] - 2026-05-10

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

### Removed

- **CSV import feature removed from admin panel** — `PortfolioImport`, `InvestmentImport`, and `BattleImport` components and their corresponding Server Actions (`portfolio-import-action.ts`, `investment-import-action.ts`, `battle-import-action.ts`) have been deleted. Server Action body size limit removed (back to default) in `next.config.ts`.

### Fixed

- **Balance sync stuck in `pending` after re-auth** — `resetSyncStatesOnReAuth` was correctly marking `BALANCE_META` as `pending` but leaving its skip-gate timestamp (`lastRunAt`) intact. The worker would pick up the account, find no trigger (< 24 h since last run), skip all per-token syncs, and silently mark `BALANCE_META` completed — leaving the 11+ token rows stuck in `pending` indefinitely. Fixed by nulling `lastRunAt` on re-auth so the skip-gate opens immediately.

### Changed

- **`AccountSyncState` field split** — the overloaded `lastSyncedCreatedDate` field has been separated into two purpose-specific fields:
  - `lastSyncedCreatedDate` — data cursor only: the latest API `created_date` seen, used by per-token (`DEC`, `SPS`, etc.) and `UNCLAIMED` rows for incremental pagination. Never written by `BALANCE_META` or `PORTFOLIO`.
  - `lastRunAt` — operational timestamp only: wall-clock time of the last completed run, used by `BALANCE_META` (24-h skip-gate / claim-trigger) and `PORTFOLIO` (once-per-UTC-day gate).
  - Migration copies existing `lastSyncedCreatedDate` → `lastRunAt` for `BALANCE_META` and `PORTFOLIO` rows, then nulls `lastSyncedCreatedDate` on `BALANCE_META` rows.
- **Admin page — JWT Expiry column** — new "JWT Expiry" chip column added to the worker status account table:
  - Green: token expires in > `JWT_WARN_DAYS` (2) days, showing days remaining
  - Yellow: expires within 2 days, showing hours or days remaining
  - Red: no expiry stored, or already expired (shows "expired Xd ago")

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
