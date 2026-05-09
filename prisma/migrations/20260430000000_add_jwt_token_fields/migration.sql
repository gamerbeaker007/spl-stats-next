-- AlterTable: add JWT expiry and worker sync tracking to spl_accounts
ALTER TABLE "spl_accounts"
  ADD COLUMN "jwt_expires_at"      TIMESTAMP(3),
  ADD COLUMN "last_worker_sync_at" TIMESTAMP(3);
