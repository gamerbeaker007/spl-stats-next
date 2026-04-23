-- Replace amount with earned + cost columns
ALTER TABLE "season_balances" ADD COLUMN "earned" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "season_balances" ADD COLUMN "cost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "season_balances" DROP COLUMN "amount";

-- All existing rows lack earned/cost breakdown — wipe and re-sync from worker
DELETE FROM "season_balances";

-- Reset balance/unclaimed sync cursors so worker does a full re-sync
UPDATE "account_sync_states"
SET last_synced_created_date = NULL,
    last_season_processed    = 0,
    status                   = 'pending',
    error_message            = NULL
WHERE key NOT IN ('LEADERBOARD_WILD', 'LEADERBOARD_MODERN', 'LEADERBOARD_FOUNDATION', 'PORTFOLIO');
