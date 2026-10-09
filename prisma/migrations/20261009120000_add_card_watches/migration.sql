-- CreateTable
CREATE TABLE "card_watches" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "card_detail_id" INTEGER NOT NULL,
    "foil" INTEGER NOT NULL,
    "low_price_bcx_at_watch" DOUBLE PRECISION NOT NULL,
    "low_price_at_watch" DOUBLE PRECISION NOT NULL,
    "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_watches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_watches_username_idx" ON "card_watches"("username");

-- CreateIndex
CREATE UNIQUE INDEX "card_watches_username_card_detail_id_foil_key" ON "card_watches"("username", "card_detail_id", "foil");
