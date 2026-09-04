-- CreateTable
CREATE TABLE "support_donations" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "usd_value" DECIMAL(18,8) NOT NULL,
    "tx" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_donations_tx_key" ON "support_donations"("tx");

-- CreateIndex
CREATE INDEX "support_donations_username_idx" ON "support_donations"("username");

-- CreateIndex
CREATE INDEX "support_donations_date_idx" ON "support_donations"("date");
