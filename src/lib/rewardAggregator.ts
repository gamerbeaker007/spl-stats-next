import {
  ClaimDailyResult,
  ClaimLeagueRewardData,
  ClaimLeagueRewardResult,
  ParsedHistory,
  PotionType,
  PurchaseResult,
  RankedDrawEntry,
  RewardItems,
  RewardSummary,
  UnbindScrollData,
} from "@/types/parsedHistory";

function emptyRewardSummary(): RewardSummary {
  return {
    totalPacks: {},
    totalFrontierEntries: 0,
    totalRankedEntries: 0,
    totalCards: {},
    totalSkins: {},
    totalMusic: {},
    totalPotions: {},
    totalPotionsUsed: {},
    totalMerits: 0,
    totalEnergy: 0,
    totalScrolls: {},
    totalDraws: { minor: 0, major: 0, ultimate: 0 },
    totalShopPurchases: {
      potions: { gold: 0, legendary: 0 },
      scrolls: { common: 0, rare: 0, epic: 0, legendary: 0 },
      merits: 0,
      rankedEntries: 0,
      chests: { minor: 0, major: 0, ultimate: 0 },
      rarityDraws: { common: 0, rare: 0, epic: 0, legendary: 0 },
    },
    leagueAdvancements: { foundation: [], wild: [], modern: [] },
    questTypeBreakdown: {},
  };
}

function processRewardArray(rewards: RewardItems[], summary: RewardSummary): void {
  rewards.forEach((reward) => {
    switch (reward.type) {
      case "reward_card":
        if (reward.card) {
          const cardId = reward.card.card_detail_id;
          if (!summary.totalCards[cardId]) {
            summary.totalCards[cardId] = {
              edition: reward.card.edition || 0,
              quantity: 0,
              gold: 0,
              regular: 0,
            };
          }
          summary.totalCards[cardId].quantity += reward.quantity;
          if (reward.card.gold) {
            summary.totalCards[cardId].gold += reward.quantity;
          } else {
            summary.totalCards[cardId].regular += reward.quantity;
          }
        }
        break;
      case "potion":
        summary.totalPotions[reward.potion_type || "unknown"] =
          (summary.totalPotions[reward.potion_type || "unknown"] || 0) + reward.quantity;
        break;
      case "merits":
        summary.totalMerits += reward.quantity;
        break;
      case "common_scroll":
      case "rare_scroll":
      case "epic_scroll":
      case "legendary_scroll":
        summary.totalScrolls[reward.type] =
          (summary.totalScrolls[reward.type] || 0) + reward.quantity;
        break;
      case "ranked_entries":
        summary.totalRankedEntries += reward.quantity;
        break;
      case "frontier_entries":
        summary.totalFrontierEntries += reward.quantity;
        break;
      case "energy":
        summary.totalEnergy += reward.quantity;
        break;
      case "pack":
        summary.totalPacks[reward.edition || 0] =
          (summary.totalPacks[reward.edition || 0] || 0) + reward.quantity;
        break;
      case "skin":
        if (!summary.totalSkins[reward.skin_detail_id]) {
          summary.totalSkins[reward.skin_detail_id] = {
            skin: reward.skin,
            cardDetailId: reward.card_detail_id,
            quantity: 0,
          };
        }
        summary.totalSkins[reward.skin_detail_id].quantity += reward.quantity;
        break;
      case "music":
        if (!summary.totalMusic[reward.music_detail_id]) {
          summary.totalMusic[reward.music_detail_id] = {
            name: reward.name ?? `Music #${reward.music_detail_id}`,
            quantity: 0,
          };
        }
        summary.totalMusic[reward.music_detail_id].quantity += reward.quantity;
        break;
    }
  });
}

function processPotionsUsed(
  potions: { legendary: { charges_used: number }; gold: { charges_used: number } },
  summary: RewardSummary
): void {
  if (potions.legendary?.charges_used) {
    summary.totalPotionsUsed["legendary"] =
      (summary.totalPotionsUsed["legendary"] || 0) + potions.legendary.charges_used;
  }
  if (potions.gold?.charges_used) {
    summary.totalPotionsUsed["gold"] =
      (summary.totalPotionsUsed["gold"] || 0) + potions.gold.charges_used;
  }
}

export function aggregateRewards(entries: ParsedHistory[]): RewardSummary {
  const summary = emptyRewardSummary();

  entries.forEach((entry) => {
    if (entry.type === "claim_daily") {
      const dailyEntry = entry.result as ClaimDailyResult;
      if (dailyEntry.quest_data?.name) {
        summary.questTypeBreakdown[dailyEntry.quest_data.name] =
          (summary.questTypeBreakdown[dailyEntry.quest_data.name] || 0) + 1;
      }
      if (dailyEntry.quest_data?.rewards?.result?.rewards) {
        processRewardArray(dailyEntry.quest_data.rewards.result.rewards, summary);
      }
      if (dailyEntry.potions) {
        processPotionsUsed(dailyEntry.potions, summary);
      }
    } else if (entry.type === "claim_reward") {
      const leagueEntry = entry.result as ClaimLeagueRewardResult;
      const leagueData = entry.data as ClaimLeagueRewardData;

      if (leagueEntry.rewards.minor_draw)
        summary.totalDraws.minor += leagueEntry.rewards.minor_draw;
      if (leagueEntry.rewards.major_draw)
        summary.totalDraws.major += leagueEntry.rewards.major_draw;
      if (leagueEntry.rewards.ultimate_draw)
        summary.totalDraws.ultimate += leagueEntry.rewards.ultimate_draw;

      if (leagueEntry.rewards.minor?.result?.rewards)
        processRewardArray(leagueEntry.rewards.minor.result.rewards, summary);
      if (leagueEntry.rewards.major?.result?.rewards)
        processRewardArray(leagueEntry.rewards.major.result.rewards, summary);
      if (leagueEntry.rewards.ultimate?.result?.rewards)
        processRewardArray(leagueEntry.rewards.ultimate.result.rewards, summary);

      if (leagueEntry.type) {
        (["minor", "major", "ultimate"] as const).forEach((tier) => {
          const tierResult = leagueEntry.rewards[tier]?.result;
          if (tierResult?.potions) {
            Object.entries(tierResult.potions).forEach(([potionType, potionData]) => {
              summary.totalPotionsUsed[potionType] =
                (summary.totalPotionsUsed[potionType] || 0) +
                ((potionData as { charges_used: number })?.charges_used || 0);
            });
          }
        });

        switch (leagueData?.format) {
          case "foundation":
            if (leagueData.tier) summary.leagueAdvancements.foundation.push(leagueData.tier);
            break;
          case "wild":
            if (leagueData.tier) summary.leagueAdvancements.wild.push(leagueData.tier);
            break;
          case "modern":
            if (leagueData.tier) summary.leagueAdvancements.modern.push(leagueData.tier);
            break;
        }
      }
    }
  });

  return summary;
}

export function aggregatePurchaseRewards(entries: PurchaseResult[]): RewardSummary {
  const summary = emptyRewardSummary();

  entries.forEach((entry) => {
    if ("data" in entry && entry.data && typeof entry.data === "object" && "result" in entry.data) {
      const drawData = entry.data as { result: { rewards: RewardItems[] } };
      if (drawData.result?.rewards) {
        processRewardArray(drawData.result.rewards, summary);
      }
    }

    switch (entry.sub_type) {
      case "minor_draw":
        summary.totalShopPurchases.chests.minor += entry.quantity || 0;
        break;
      case "major_draw":
        summary.totalShopPurchases.chests.major += entry.quantity || 0;
        break;
      case "ultimate_draw":
        summary.totalShopPurchases.chests.ultimate += entry.quantity || 0;
        break;
      case "common_draw":
        summary.totalShopPurchases.rarityDraws.common += entry.quantity || 0;
        break;
      case "rare_draw":
        summary.totalShopPurchases.rarityDraws.rare += entry.quantity || 0;
        break;
      case "epic_draw":
        summary.totalShopPurchases.rarityDraws.epic += entry.quantity || 0;
        break;
      case "legendary_draw":
        summary.totalShopPurchases.rarityDraws.legendary += entry.quantity || 0;
        break;
      case "reward_merits":
        summary.totalShopPurchases.merits += entry.quantity / 200 || 0;
        summary.totalMerits += entry.quantity || 0;
        break;
    }

    if (entry.type === "potion") {
      const potion = entry.data as PotionType;
      if (potion.potion_type === "GOLD") {
        summary.totalShopPurchases.potions.gold += entry.quantity || 0;
      } else if (potion.potion_type === "LEGENDARY") {
        summary.totalShopPurchases.potions.legendary += entry.quantity || 0;
      }
    }

    if (entry.type === "ranked_draw_entry") {
      const rankedEntry = entry.data as RankedDrawEntry;
      summary.totalShopPurchases.rankedEntries += rankedEntry.result?.player_entries || 0;
    }

    if (entry.type === "unbind_scroll") {
      const unbindScroll = entry.data as UnbindScrollData;
      switch (unbindScroll?.data?.scroll_type) {
        case "UNBIND_CA_C":
          summary.totalShopPurchases.scrolls.common += unbindScroll.qty || 0;
          break;
        case "UNBIND_CA_R":
          summary.totalShopPurchases.scrolls.rare += unbindScroll.qty || 0;
          break;
        case "UNBIND_CA_E":
          summary.totalShopPurchases.scrolls.epic += unbindScroll.qty || 0;
          break;
        case "UNBIND_CA_L":
          summary.totalShopPurchases.scrolls.legendary += unbindScroll.qty || 0;
          break;
      }
    }
  });

  return summary;
}

export function mergeRewardSummaries(...summaries: RewardSummary[]): RewardSummary {
  const merged = emptyRewardSummary();

  summaries.forEach((summary) => {
    Object.entries(summary.totalPacks).forEach(([edition, count]) => {
      merged.totalPacks[Number(edition)] = (merged.totalPacks[Number(edition)] || 0) + count;
    });
    merged.totalFrontierEntries += summary.totalFrontierEntries;
    merged.totalRankedEntries += summary.totalRankedEntries;
    Object.entries(summary.totalCards).forEach(([cardId, data]) => {
      const id = Number(cardId);
      if (!merged.totalCards[id]) {
        merged.totalCards[id] = { ...data };
      } else {
        merged.totalCards[id].quantity += data.quantity;
        merged.totalCards[id].gold += data.gold;
        merged.totalCards[id].regular += data.regular;
      }
    });
    Object.entries(summary.totalSkins).forEach(([id, data]) => {
      const numId = Number(id);
      if (!merged.totalSkins[numId]) {
        merged.totalSkins[numId] = { ...data };
      } else {
        merged.totalSkins[numId].quantity += data.quantity;
      }
    });
    Object.entries(summary.totalMusic).forEach(([id, data]) => {
      const numId = Number(id);
      if (!merged.totalMusic[numId]) {
        merged.totalMusic[numId] = { ...data };
      } else {
        merged.totalMusic[numId].quantity += data.quantity;
      }
    });
    Object.entries(summary.totalPotions).forEach(([type, count]) => {
      merged.totalPotions[type] = (merged.totalPotions[type] || 0) + count;
    });
    Object.entries(summary.totalPotionsUsed).forEach(([type, count]) => {
      merged.totalPotionsUsed[type] = (merged.totalPotionsUsed[type] || 0) + count;
    });
    merged.totalMerits += summary.totalMerits;
    merged.totalEnergy += summary.totalEnergy;
    Object.entries(summary.totalScrolls).forEach(([type, count]) => {
      merged.totalScrolls[type] = (merged.totalScrolls[type] || 0) + count;
    });
    merged.totalDraws.minor += summary.totalDraws.minor;
    merged.totalDraws.major += summary.totalDraws.major;
    merged.totalDraws.ultimate += summary.totalDraws.ultimate;
    merged.totalShopPurchases.chests.minor += summary.totalShopPurchases.chests.minor;
    merged.totalShopPurchases.chests.major += summary.totalShopPurchases.chests.major;
    merged.totalShopPurchases.chests.ultimate += summary.totalShopPurchases.chests.ultimate;
    merged.totalShopPurchases.potions.gold += summary.totalShopPurchases.potions.gold;
    merged.totalShopPurchases.potions.legendary += summary.totalShopPurchases.potions.legendary;
    merged.totalShopPurchases.merits += summary.totalShopPurchases.merits;
    merged.totalShopPurchases.rankedEntries += summary.totalShopPurchases.rankedEntries;
    merged.totalShopPurchases.rarityDraws.common += summary.totalShopPurchases.rarityDraws.common;
    merged.totalShopPurchases.rarityDraws.rare += summary.totalShopPurchases.rarityDraws.rare;
    merged.totalShopPurchases.rarityDraws.epic += summary.totalShopPurchases.rarityDraws.epic;
    merged.totalShopPurchases.rarityDraws.legendary +=
      summary.totalShopPurchases.rarityDraws.legendary;
    merged.leagueAdvancements.foundation.push(...summary.leagueAdvancements.foundation);
    merged.leagueAdvancements.wild.push(...summary.leagueAdvancements.wild);
    merged.leagueAdvancements.modern.push(...summary.leagueAdvancements.modern);
    Object.entries(summary.questTypeBreakdown).forEach(([type, count]) => {
      merged.questTypeBreakdown[type] = (merged.questTypeBreakdown[type] || 0) + count;
    });
  });

  return merged;
}
