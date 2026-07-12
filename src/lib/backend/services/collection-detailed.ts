import { getCachedSplCardCollection, getCachedSplCardDetails } from "@/lib/backend/cache/spl-cache";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { toCardFoil } from "@/lib/shared/card-utils";
import { CardSetName } from "@/lib/shared/edition-utils";
import { toCardRarity } from "@/lib/shared/rarity-utils";
import {
  CardColor,
  CardDetail,
  CardFoil,
  DetailedPlayerCardCollection,
  DetailedPlayerCardCollectionItem,
  toCardRole,
} from "@/types/card";
import { SplCardDetail } from "@/types/spl/cardDetails";

/**
 * Editions a card was printed in. A single card detail (one `card_detail_id`)
 * can exist in several editions.
 */
function parseCardEditions(detail: SplCardDetail): number[] {
  const fromList = (detail.editions ?? "")
    .split(",")
    .map((e) => Number.parseInt(e.trim(), 10))
    .filter((n) => Number.isInteger(n));

  if (fromList.length > 0) return Array.from(new Set(fromList));

  return [detail.distribution?.[0]?.edition ?? 0];
}

/**
 * Foils this card was printed in for a given edition.
 */
function parseAvailableFoils(detail: SplCardDetail, edition: number): CardFoil[] {
  const foils = Array.from(
    new Set(
      (detail.distribution ?? [])
        .filter((d) => d.edition === edition)
        .map((d) => toCardFoil(d.foil))
    )
  );
  return foils.length > 0 ? foils : ["regular"];
}

function buildCollectionItem(
  detail: SplCardDetail,
  edition: number
): DetailedPlayerCardCollectionItem {
  return {
    cardDetailId: detail.id,
    name: detail.name,
    edition,
    tier: detail.tier ?? edition,
    rarity: toCardRarity(detail.rarity),
    color: detail.color as CardColor,
    secondaryColor: detail.secondary_color as CardColor,
    role: toCardRole(detail.type),
    availableFoils: parseAvailableFoils(detail, edition),
    cardStats: detail.stats,
    allCards: [],
  };
}

export async function getDetailedPlayerCardCollectionCached(
  username: string
): Promise<DetailedPlayerCardCollection> {
  const normalized = username.trim().toLowerCase();
  const [collection, cardDetails] = await Promise.all([
    getCachedSplCardCollection(normalized),
    getCachedSplCardDetails(),
  ]);

  const detailedMap: DetailedPlayerCardCollection = {};
  const detailById = new Map<number, SplCardDetail>();

  for (const detail of cardDetails) {
    detailById.set(detail.id, detail);
    for (const edition of parseCardEditions(detail)) {
      detailedMap[`${detail.id}-${edition}`] = buildCollectionItem(detail, edition);
    }
  }

  for (const playerCard of collection.cards) {
    const key = `${playerCard.card_detail_id}-${playerCard.edition}`;
    let item = detailedMap[key];

    if (!item) {
      const detail = detailById.get(playerCard.card_detail_id);
      if (!detail) continue;
      item = buildCollectionItem(detail, playerCard.edition);
      detailedMap[key] = item;
    }

    const foil: CardFoil = toCardFoil(playerCard.foil);
    const cardDetail: CardDetail = {
      id: playerCard.card_detail_id,
      uid: playerCard.uid,
      owner: playerCard.player,
      delegatedTo: playerCard.delegated_to,
      xp: playerCard.xp,
      edition: playerCard.edition,
      cardSet: playerCard.card_set as CardSetName,
      collectionPower: playerCard.collection_power,
      bcx: playerCard.bcx,
      bcxUnbound: playerCard.bcx_unbound,
      foil,
      mint: playerCard.mint,
      level: playerCard.level,
      onWagon: playerCard.wagon_uid !== null,
      onLand: playerCard.stake_ref_uid !== null,
      inSet: playerCard.set_id !== null,
      imgUrl: getCardImageByLevel(item.name, playerCard.edition, foil, playerCard.level),
    };

    item.allCards!.push(cardDetail);

    if (!item.highestLevelCard || cardDetail.level > item.highestLevelCard.level) {
      item.highestLevelCard = cardDetail;
    }
  }

  return detailedMap;
}
