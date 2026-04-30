/** How often the worker checks for accounts due for sync (queue polling interval). */
export const WORKER_CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
/** How often public syncs (leaderboard, portfolio) are triggered. */
export const WORKER_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
/** An account becomes eligible for token-dependent sync after this interval since last sync. */
export const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
/** Skip re-syncing the current season if it was successfully completed within this window. */
export const RESCAN_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const BALANCE_HISTORY_PAGE_LIMIT = 1000;
export const REQUEST_DELAY_MS = 1000;
/** Prune log rows older than this many days at the end of each worker cycle. */
export const LOG_RETENTION_DAYS = 5;
