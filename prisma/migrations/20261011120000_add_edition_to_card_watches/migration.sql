-- Preserve existing watch rows; -1 identifies watches created before edition was tracked.
ALTER TABLE "card_watches"
ADD COLUMN "edition" INTEGER NOT NULL DEFAULT -1;

DROP INDEX "card_watches_username_card_detail_id_foil_key";

CREATE UNIQUE INDEX "card_watches_username_card_detail_id_edition_foil_key"
ON "card_watches"("username", "card_detail_id", "edition", "foil");