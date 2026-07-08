"use server";

import { fetchAccountCardCollection } from "@/lib/backend/api/spl/spl-api";
import { getCachedSplCardDetails } from "@/lib/backend/cache/spl-cache";
import { cacheLife } from "next/cache";

export interface BucketFoilCount {
  foil: number;
  count: number;
}

export interface BucketCardEntry {
  card_detail_id: number;
  name: string;
  foils: BucketFoilCount[];
  total: number;
}

export interface AccountBucketResult {
  cards: BucketCardEntry[];
}

export async function getAccountBucket(username: string): Promise<AccountBucketResult> {
  "use cache";
  cacheLife("hours");

  const [cards, allCardDetails] = await Promise.all([
    fetchAccountCardCollection(username),
    getCachedSplCardDetails(),
  ]);

  const cardDetailMap = new Map(allCardDetails.map((c) => [c.id, c]));

  const bucketMap = new Map<number, Map<number, number>>();
  for (const card of cards) {
    if (!bucketMap.has(card.card_detail_id)) {
      bucketMap.set(card.card_detail_id, new Map());
    }
    const foilMap = bucketMap.get(card.card_detail_id)!;
    foilMap.set(card.foil, (foilMap.get(card.foil) ?? 0) + 1);
  }

  const result: BucketCardEntry[] = [];
  for (const [cardDetailId, foilMap] of bucketMap.entries()) {
    const detail = cardDetailMap.get(cardDetailId);
    const foils = Array.from(foilMap.entries())
      .map(([foil, count]) => ({ foil, count }))
      .sort((a, b) => a.foil - b.foil);

    result.push({
      card_detail_id: cardDetailId,
      name: detail?.name ?? `Card #${cardDetailId}`,
      foils,
      total: foils.reduce((s, f) => s + f.count, 0),
    });
  }

  result.sort((a, b) => a.card_detail_id - b.card_detail_id);

  return { cards: result };
}
