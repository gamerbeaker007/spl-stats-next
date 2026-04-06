import { CardFoil, cardFoilSuffixMap } from "@/types/card";
import { EDITION_DEFS, getEditionUrlName } from "@/lib/shared/edition-utils";
import { PeakmonstersMarketPriceEntry } from "@/types/peakmonsters/market";
import { EditionValues, PlayerCollectionValue } from "@/types/playerCardCollection";
import { EnrichedCollectionCard, SplCardCollection, SplPlayerCard } from "@/types/spl/card";
import { SplCardListingPriceEntry } from "@/types/spl/market";
import { WEB_URL } from "./staticsIconUrls";

/**
 * Group cards by BCX to reduce processing time for identifying values
 */
function groupBcx(cards: SplPlayerCard[]): EnrichedCollectionCard[] {
  const grouped = new Map<string, EnrichedCollectionCard & { count: number }>();

  cards.forEach((card) => {
    const key = `${card.player}-${card.card_detail_id}-${card.xp}-${card.gold}-${card.edition}-${card.level}-${card.bcx}-${card.bcx_unbound}`;

    if (grouped.has(key)) {
      grouped.get(key)!.count += 1;
    } else {
      grouped.set(key, { ...card, count: 1 });
    }
  });

  return Array.from(grouped.values());
}

function isCardSellable(collectionCard: SplPlayerCard): boolean {
  if (collectionCard.edition === 6 || collectionCard.edition === 16) {
    return false;
  } else if ([10, 13].includes(collectionCard.edition)) {
    return collectionCard.bcx === collectionCard.bcx_unbound;
  } else if (collectionCard.edition === 18 && collectionCard.foil === 0) {
    return collectionCard.bcx === collectionCard.bcx_unbound;
  } else {
    return true;
  }
}

function findCard(
  collectionCard: EnrichedCollectionCard,
  priceData: SplCardListingPriceEntry[] | PeakmonstersMarketPriceEntry[]
): (SplCardListingPriceEntry | PeakmonstersMarketPriceEntry)[] {
  return priceData.filter(
    (price) =>
      price.card_detail_id === collectionCard.card_detail_id &&
      price.gold === collectionCard.gold &&
      price.edition === collectionCard.edition
  );
}

function getListPrice(
  collectionCard: EnrichedCollectionCard,
  listPrices: SplCardListingPriceEntry[]
): number | null {
  const priceData = findCard(collectionCard, listPrices) as SplCardListingPriceEntry[];
  if (priceData.length > 0) {
    const sorted = priceData.sort((a, b) => a.low_price_bcx - b.low_price_bcx);
    return sorted[0].low_price_bcx;
  }
  return null;
}

function getMarketPrice(
  collectionCard: EnrichedCollectionCard,
  marketPrices: PeakmonstersMarketPriceEntry[],
  listPrice?: number | null
): number | null {
  const priceData = findCard(collectionCard, marketPrices) as PeakmonstersMarketPriceEntry[];
  if (priceData.length > 0) {
    const sorted = priceData.sort((a, b) => a.last_bcx_price - b.last_bcx_price);
    const marketPrice = sorted[0].last_bcx_price;
    return listPrice ? Math.min(marketPrice, listPrice) : marketPrice;
  }
  return null;
}

function getCollectionValue(
  cards: EnrichedCollectionCard[],
  listPrices: SplCardListingPriceEntry[],
  marketPrices: PeakmonstersMarketPriceEntry[]
): { listValue: number; marketValue: number } {
  let totalListValue = 0;
  let totalMarketValue = 0;

  cards.forEach((collectionCard) => {
    const bcx = collectionCard.bcx * collectionCard.count;
    const listPrice = getListPrice(collectionCard, listPrices);
    if (listPrice) totalListValue += bcx * listPrice;

    const marketPrice = getMarketPrice(collectionCard, marketPrices, listPrice);
    if (marketPrice) totalMarketValue += bcx * marketPrice;

    if (!listPrice && !marketPrice) {
      console.warn(
        `Card ID '${collectionCard.card_detail_id}' not found on market, ignoring for collection value`
      );
    }
  });

  return { listValue: totalListValue, marketValue: totalMarketValue };
}

/**
 * Compute full collection value for a player
 */
export async function getPlayerCollectionValue(
  playerCollection: SplCardCollection,
  listPrices: SplCardListingPriceEntry[],
  marketPrices: PeakmonstersMarketPriceEntry[]
): Promise<PlayerCollectionValue> {
  const account = playerCollection.player;
  const playerCards = playerCollection.cards;
  console.info(`Getting card values for account: ${account}`);

  const totalNumberOfCards = playerCards.length;
  const totalBcx = playerCards.reduce((total, card) => total + card.bcx, 0);
  const sellableCards = playerCards.filter(isCardSellable);
  const totalSellableCards = sellableCards.length;

  const result: PlayerCollectionValue = {
    player: account,
    totalListValue: 0,
    totalMarketValue: 0,
    totalBcx,
    totalNumberOfCards,
    totalSellableCards,
    editionValues: {} as EditionValues,
  };

  if (sellableCards.length > 0) {
    const groupedCards = groupBcx(sellableCards);

    EDITION_DEFS.forEach(({ id: edition }) => {
      const editionCards = groupedCards.filter((card) => card.edition === edition);
      const collectionValue = getCollectionValue(editionCards, listPrices, marketPrices);

      result.editionValues[edition] = {
        listValue: collectionValue.listValue,
        marketValue: collectionValue.marketValue,
        bcx: playerCards
          .filter((card) => card.edition === edition)
          .reduce((sum, card) => sum + card.bcx, 0),
        numberOfCards: playerCards.filter((card) => card.edition === edition).length,
        numberOfSellableCards: sellableCards.filter((card) => card.edition === edition).length,
      };
      result.totalMarketValue += collectionValue.marketValue;
      result.totalListValue += collectionValue.listValue;
    });
  }

  return result;
}

/**
 * Generate image URL for a card
 */
export function getCardImg(
  cardName: string,
  editionId: number,
  foil: CardFoil,
  level?: number
): string {
  const suffix = cardFoilSuffixMap[foil] ?? "";
  const baseCardUrl = `${WEB_URL}cards_by_level`;
  const safeCardName = encodeURIComponent(cardName.trim());
  const lvl = level && level > 1 ? level : 1;
  const editionName = getEditionUrlName(editionId) ?? "unknown_edition";

  return `${baseCardUrl}/${editionName}/${safeCardName}_lv${lvl}${suffix}.png`;
}
