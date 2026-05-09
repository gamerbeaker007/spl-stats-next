import { fetchTransactionLookup } from "@/lib/backend/api/spl/spl-api";
import { fetchMarketHistoryByDateRange } from "@/lib/backend/api/spl/spl-authenticated-api";
import { fetchListingItem } from "@/lib/backend/api/spl/vapi-spl";
import type { HiveBlogMarketCard, HiveBlogMarketItem } from "@/types/hive-blog";
import { CardFoil } from "@/types/card";

export type ParsedCardUid = {
  foil: CardFoil;
  edition: number;
  cardDetailId: number;
};

/** Parse a Splinterlands card UID (e.g. "C7-378-G32ZII2HWG") into card metadata. */
const foilCodeMap: Record<string, CardFoil> = {
  C: "regular",
  G: "gold",
  B: "black",
  GA: "gold arcane",
  BA: "black arcane",
};

export function parseCardUid(cardUid: string | null | undefined): ParsedCardUid | null {
  if (!cardUid) return null;
  const match = new RegExp(/^([A-Z]+)(\d+)-(\d+)-/).exec(cardUid);
  if (!match) return null;

  const foil = foilCodeMap[match[1]];
  const edition = Number(match[2]);
  const cardDetailId = Number(match[3]);

  if (!foil || Number.isNaN(edition) || Number.isNaN(cardDetailId)) {
    return null;
  }

  return { foil, edition, cardDetailId };
}

/**
 * Extract ordered card UIDs from a transaction lookup result.
 * Handles both market_list (data.cards array) and update_price (result.for_sale array).
 */
function extractCardUids(trxInfo: { data: string; result: string | null }): string[] {
  try {
    const d = JSON.parse(trxInfo.data) as Record<string, unknown>;
    if (Array.isArray(d.cards)) {
      return (d.cards as [string, number][]).map((c) => c[0]);
    }
  } catch {
    // ignore
  }
  try {
    if (trxInfo.result) {
      const r = JSON.parse(trxInfo.result) as Record<string, unknown>;
      if (Array.isArray(r.for_sale)) return r.for_sale as string[];
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Resolve a list of market item IDs ("trxId-index") to card metadata.
 * lookupCache prevents duplicate API calls for the same trxId.
 */
async function resolveCardItems(
  itemIds: string[],
  lookupCache: Map<string, string[]>
): Promise<ParsedCardUid[]> {
  const byTrxId = new Map<string, number[]>();
  for (const item of itemIds) {
    const lastDash = item.lastIndexOf("-");
    if (lastDash === -1) continue;
    const trxId = item.slice(0, lastDash);
    const idx = Number.parseInt(item.slice(lastDash + 1), 10);
    if (!byTrxId.has(trxId)) byTrxId.set(trxId, []);
    byTrxId.get(trxId)!.push(idx);
  }

  const results: ParsedCardUid[] = [];
  for (const [trxId, indices] of byTrxId) {
    if (!lookupCache.has(trxId)) {
      const info = await fetchTransactionLookup(trxId);
      lookupCache.set(trxId, info ? extractCardUids(info) : []);
    }
    const uids = lookupCache.get(trxId)!;
    for (const idx of indices) {
      const uid = uids[idx];
      if (!uid) continue;
      const parsed = parseCardUid(uid);
      if (parsed) results.push(parsed);
    }
  }
  return results;
}

function aggregateCards(
  cards: ParsedCardUid[],
  nameMap: Map<number, string>
): HiveBlogMarketCard[] {
  const agg: Record<string, HiveBlogMarketCard> = {};
  for (const c of cards) {
    const name = nameMap.get(c.cardDetailId) ?? `Card #${c.cardDetailId}`;
    if (!agg[name]) agg[name] = { name, edition: c.edition, foilCounts: {} };
    agg[name].foilCounts[c.foil] = (agg[name].foilCounts[c.foil] ?? 0) + 1;
  }
  return Object.values(agg).sort((a, b) => a.name.localeCompare(b.name));
}

function aggregateItems(
  items: Array<{ detailId: string; quantity: number }>
): HiveBlogMarketItem[] {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.detailId, (map.get(item.detailId) ?? 0) + item.quantity);
  }
  return Array.from(map.entries())
    .map(([detailId, quantity]) => ({ detailId, quantity }))
    .sort((a, b) => a.detailId.localeCompare(b.detailId));
}

export async function buildMarketData(
  username: string,
  startDate: Date,
  endDate: Date,
  cardDetailsMap: Map<number, string>,
  token: string
): Promise<{
  boughtCards: HiveBlogMarketCard[];
  soldCards: HiveBlogMarketCard[];
  boughtItems: HiveBlogMarketItem[];
  soldItems: HiveBlogMarketItem[];
}> {
  const empty = { boughtCards: [], soldCards: [], boughtItems: [], soldItems: [] };
  try {
    const history = await fetchMarketHistoryByDateRange(username, token, startDate, endDate);
    if (history.length === 0) return empty;

    const boughtCardRaw: ParsedCardUid[] = [];
    const soldCardRaw: ParsedCardUid[] = [];
    const boughtItemRaw: Array<{ detailId: string; quantity: number }> = [];
    const soldItemRaw: Array<{ detailId: string; quantity: number }> = [];
    const lookupCache = new Map<string, string[]>();

    for (const entry of history) {
      if (!entry.success) continue;
      try {
        const data = JSON.parse(entry.data) as Record<string, unknown>;
        const result = entry.result ? (JSON.parse(entry.result) as Record<string, unknown>) : null;

        if (entry.type === "market_purchase") {
          if (entry.is_owner) {
            // We are the buyer — all items in data.items belong to us
            const items = (data.items as string[]) ?? [];
            const cards = await resolveCardItems(items, lookupCache);
            boughtCardRaw.push(...cards);
          } else {
            // We are a seller — find our items in result.by_seller
            const bySeller =
              (result?.by_seller as Array<{ seller: string; items: string[] }>) ?? [];
            const ours = bySeller.find((s) => s.seller === username);
            if (ours) {
              const cards = await resolveCardItems(ours.items, lookupCache);
              soldCardRaw.push(...cards);
            }
          }
        } else if (entry.type === "marketplace_purchase") {
          const items = (data.items as Array<{ listingItemId: number; quantity: number }>) ?? [];

          if (entry.is_owner) {
            // We are the buyer
            await Promise.all(
              items.map(async (item) => {
                try {
                  const listing = await fetchListingItem(item.listingItemId);
                  if (listing?.data?.item?.detailId) {
                    boughtItemRaw.push({
                      detailId: listing.data.item.detailId,
                      quantity: item.quantity,
                    });
                  }
                } catch {
                  // ignore individual lookup failures
                }
              })
            );
          } else {
            // We are the seller — confirm via listing ownership
            await Promise.all(
              items.map(async (item) => {
                try {
                  const listing = await fetchListingItem(item.listingItemId);
                  if (listing?.data?.listing?.player === username && listing.data.item?.detailId) {
                    soldItemRaw.push({
                      detailId: listing.data.item.detailId,
                      quantity: item.quantity,
                    });
                  }
                } catch {
                  // ignore individual lookup failures
                }
              })
            );
          }
        }
      } catch {
        // ignore parsing errors for individual entries
      }
    }

    return {
      boughtCards: aggregateCards(boughtCardRaw, cardDetailsMap),
      soldCards: aggregateCards(soldCardRaw, cardDetailsMap),
      boughtItems: aggregateItems(boughtItemRaw),
      soldItems: aggregateItems(soldItemRaw),
    };
  } catch {
    return empty;
  }
}
