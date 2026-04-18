-- Add foil column to both battle card tables.
-- Initial backfill: gold=false → foil 0 (Regular), gold=true → foil 1 (Gold).
-- Arcane/Black foil information for existing rows is lost; future imports record the
-- full foil number (0=Regular, 1=Gold, 2=Gold Arcane, 3=Black, 4=Black Arcane).

-- AlterTable
ALTER TABLE "player_battle_cards" ADD COLUMN "foil" INTEGER NOT NULL DEFAULT 0;
UPDATE "player_battle_cards" SET "foil" = 1 WHERE "gold" = true;

-- AlterTable
ALTER TABLE "opponent_battle_cards" ADD COLUMN "foil" INTEGER NOT NULL DEFAULT 0;
UPDATE "opponent_battle_cards" SET "foil" = 1 WHERE "gold" = true;
