-- CreateTable
CREATE TABLE "asset_watches" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "asset_name" TEXT NOT NULL,
    "detail_id" TEXT NOT NULL,
    "price_at_watch" DOUBLE PRECISION NOT NULL,
    "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_watches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_watches_username_idx" ON "asset_watches"("username");

-- CreateIndex
CREATE UNIQUE INDEX "asset_watches_username_asset_name_detail_id_key" ON "asset_watches"("username", "asset_name", "detail_id");