import { fetchPlayerHistoryByDateRange } from "@/lib/backend/api/spl/spl-authenticated-api";
import { fetchMarketLanding } from "@/lib/backend/api/spl/vapi-spl";
import { getSkinImageUrl } from "@/lib/shared/card-image-utils";
import {
  aggregatePurchaseRewards,
  aggregateRewards,
  mergeRewardSummaries,
} from "@/lib/rewardAggregator";
import type { ParsedHistory, PurchaseResult } from "@/types/parsedHistory";
import type { HiveBlogMarketCard, HiveBlogRewardSummary } from "@/types/hive-blog";

export async function buildRewardSummary(
  username: string,
  _seasonId: number,
  startDate: Date,
  endDate: Date,
  token: string | undefined,
  cardDetailsMap: Map<number, string>
): Promise<HiveBlogRewardSummary | null> {
  if (!token) return null;
  try {
    const REWARD_TYPES = "claim_reward,claim_daily,purchase";
    const allHistory: ParsedHistory[] = await fetchPlayerHistoryByDateRange(
      username,
      token,
      REWARD_TYPES,
      startDate,
      endDate
    );

    const purchaseEntries = allHistory
      .filter(
        (e): e is ParsedHistory & { type: "purchase"; result: PurchaseResult } =>
          e.type === "purchase" && e.result !== null
      )
      .map((e) => e.result as PurchaseResult);

    const agg = mergeRewardSummaries(
      aggregateRewards(allHistory),
      aggregatePurchaseRewards(purchaseEntries)
    );

    const earnedCards: HiveBlogMarketCard[] = Object.entries(agg.totalCards)
      .map(([idStr, data]) => {
        const id = Number(idStr);
        const name = cardDetailsMap.get(id) ?? `Card #${id}`;
        const foilCounts: HiveBlogMarketCard["foilCounts"] = {};
        if (data.regular > 0) foilCounts["regular"] = data.regular;
        if (data.gold > 0) foilCounts["gold"] = data.gold;
        return { name, edition: data.edition, foilCounts };
      })
      .filter((c) => Object.values(c.foilCounts).some((v) => (v ?? 0) > 0))
      .sort((a, b) => a.name.localeCompare(b.name));

    const landingAssets = await fetchMarketLanding(username).catch(() => []);
    const landingByDetailId = new Map(landingAssets.map((a) => [a.detailId, a]));

    const earnedSkins = Object.entries(agg.totalSkins).map(([idStr, data]) => {
      const cardName = cardDetailsMap.get(data.cardDetailId) ?? `Card #${data.cardDetailId}`;
      const landingAsset = landingByDetailId.get(String(idStr));
      const imageUrl = landingAsset?.detailImage ?? getSkinImageUrl(cardName, data.skin);
      return { skinName: data.skin, cardName, imageUrl, quantity: data.quantity };
    });

    const earnedMusic = Object.entries(agg.totalMusic).map(([idStr, data]) => {
      const landingAsset = landingByDetailId.get(String(idStr));
      const imageUrl = landingAsset?.detailImage ?? "";
      const name = landingAsset?.detailName ?? data.name;
      return { name, imageUrl, quantity: data.quantity };
    });

    return {
      minor: agg.totalDraws.minor,
      major: agg.totalDraws.major,
      ultimate: agg.totalDraws.ultimate,
      potions: agg.totalPotions,
      potionsUsed: agg.totalPotionsUsed,
      merits: agg.totalMerits,
      energy: agg.totalEnergy,
      scrolls: agg.totalScrolls,
      packs: agg.totalPacks,
      frontierEntries: agg.totalFrontierEntries,
      rankedEntries: agg.totalRankedEntries,
      earnedCards,
      earnedSkins,
      earnedMusic,
      shopChestMinor: agg.totalShopPurchases.chests.minor,
      shopChestMajor: agg.totalShopPurchases.chests.major,
      shopChestUltimate: agg.totalShopPurchases.chests.ultimate,
      shopMerits: agg.totalShopPurchases.merits,
      shopRankedEntries: agg.totalShopPurchases.rankedEntries,
      shopRarityDraws: agg.totalShopPurchases.rarityDraws,
      shopScrolls: agg.totalShopPurchases.scrolls,
      shopPotions: agg.totalShopPurchases.potions,
    };
  } catch {
    return null;
  }
}
