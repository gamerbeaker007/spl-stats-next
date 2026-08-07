-- Consolidated migration:
-- 1) add optional notes field to portfolio_investments
-- 2) allow duplicate (username, date, amount) entries for manual transactions
-- 3) keep a non-unique index for lookup performance

ALTER TABLE "portfolio_investments"
ADD COLUMN "notes" VARCHAR(140);

DROP INDEX IF EXISTS "portfolio_investments_username_date_amount_key";
DROP INDEX IF EXISTS "portfolio_investments_username_date_amount_idx";

CREATE INDEX "portfolio_investments_username_date_amount_idx"
ON "portfolio_investments"("username", "date", "amount");
