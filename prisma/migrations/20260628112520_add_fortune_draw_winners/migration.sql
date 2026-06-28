-- CreateEnum
CREATE TYPE "FortuneType" AS ENUM ('FRONTIER', 'RANKED');

-- CreateTable
CREATE TABLE "fortune_winners" (
    "type" "FortuneType" NOT NULL,
    "draw_id" INTEGER NOT NULL,
    "draw_number" INTEGER NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "player" TEXT NOT NULL,
    "entries" INTEGER NOT NULL,
    "total_entries" INTEGER NOT NULL,
    "trx_id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "block_num" INTEGER NOT NULL,
    "block_time" TIMESTAMP(3) NOT NULL,
    "prev_block_id" TEXT NOT NULL,
    "card_detail_id" INTEGER NOT NULL,
    "card_edition" INTEGER NOT NULL,
    "card_foil" INTEGER NOT NULL,
    "card_tier" INTEGER NOT NULL,
    "card_uid" TEXT NOT NULL,
    "card_mint" TEXT NOT NULL,
    "card_xp" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fortune_winners_pkey" PRIMARY KEY ("type","draw_id","player")
);

-- CreateIndex
CREATE UNIQUE INDEX "fortune_winners_card_uid_key" ON "fortune_winners"("card_uid");

-- CreateIndex
CREATE INDEX "fortune_winners_player_idx" ON "fortune_winners"("player");

-- CreateIndex
CREATE INDEX "fortune_winners_draw_number_idx" ON "fortune_winners"("draw_number");

-- CreateIndex
CREATE INDEX "fortune_winners_end_date_idx" ON "fortune_winners"("end_date");
