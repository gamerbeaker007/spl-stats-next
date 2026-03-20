-- AlterTable
ALTER TABLE "spl_accounts" ADD COLUMN     "token_status" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "token_verified_at" TIMESTAMP(3);
