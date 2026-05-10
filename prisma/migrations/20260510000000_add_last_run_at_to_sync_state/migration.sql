-- AlterTable: add lastRunAt to AccountSyncState
-- lastRunAt is an operational timestamp (wall-clock "when did this run complete?")
-- used by BALANCE_META (24-h skip-gate) and PORTFOLIO (once-per-UTC-day gate).
-- lastSyncedCreatedDate remains the data cursor (API transaction date) for per-token
-- and UNCLAIMED rows only.
ALTER TABLE "account_sync_states"
  ADD COLUMN "last_run_at" TIMESTAMP(3);

-- Migrate existing data: copy lastSyncedCreatedDate → lastRunAt for rows that used
-- it as an operational timestamp (BALANCE_META and PORTFOLIO).
UPDATE "account_sync_states"
  SET "last_run_at" = "last_synced_created_date"
  WHERE key IN ('BALANCE_META', 'PORTFOLIO');

-- Clear lastSyncedCreatedDate from BALANCE_META rows — BALANCE_META has no
-- data cursor; it only ever used this field as the skip-gate (now lastRunAt).
UPDATE "account_sync_states"
  SET "last_synced_created_date" = NULL
  WHERE key = 'BALANCE_META';
