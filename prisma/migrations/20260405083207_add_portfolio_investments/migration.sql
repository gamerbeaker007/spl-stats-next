-- CreateTable
CREATE TABLE "portfolio_investments" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "username" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_investments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_investments_username_idx" ON "portfolio_investments"("username");

-- CreateIndex
CREATE INDEX "portfolio_investments_date_idx" ON "portfolio_investments"("date");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_investments_username_date_amount_key" ON "portfolio_investments"("username", "date", "amount");
