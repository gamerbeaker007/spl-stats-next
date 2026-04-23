import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import {
  img,
  leagueIconMd,
  PROXY20,
  PROXY50,
  PROXY150,
} from "@/lib/backend/services/hive-blog-icons";
import {
  credits_icon_url,
  dec_icon_url,
  energy_icon_url,
  foundation_entries_icon_url,
  glint_icon_url,
  gold_icon_url,
  legendary_icon_url,
  merits_icon_url,
  pack_beta_icon_url,
  pack_chaos_icon_url,
  pack_foundations_icon_url,
  pack_rift_icon_url,
  ranked_entries_icon_url,
  reward_draw_common_icon_url,
  reward_draw_epic_icon_url,
  reward_draw_legendary_icon_url,
  reward_draw_major_icon_url,
  reward_draw_minor_icon_url,
  reward_draw_rare_icon_url,
  reward_draw_ultimate_icon_url,
  spl_logo_icon_url,
  splinterlands_statistics_icon_url,
  sps_icon_url,
  unbind_ca_c_icon_url,
  unbind_ca_e_icon_url,
  unbind_ca_l_icon_url,
  unbind_ca_r_icon_url,
  voucher_icon_url,
} from "@/lib/staticsIconUrls";
import type { CardFoil } from "@/types/card";
import type { HiveBlogAccountData, HiveBlogMarketCard } from "@/types/hive-blog";

const HEADER = "# <div class=phishy>";
const SUB_HEADER = "## <div class=phishy>";
const CLOSE_HEADER = "</div>";

const EARNINGS_GROUPS: { label: string; groupIcon: string; tokens: Set<string> }[] = [
  { label: "DEC", groupIcon: img(dec_icon_url), tokens: new Set(["DEC", "DEC-B"]) },
  {
    label: "SPS",
    groupIcon: img(sps_icon_url),
    // SPSP/SPSP-OUT/SPSP-IN omitted from report
    tokens: new Set(["SPS", "UNCLAIMED_SPS"]),
  },
  { label: "Merits", groupIcon: img(merits_icon_url), tokens: new Set(["MERITS"]) },
  { label: "Glint", groupIcon: img(glint_icon_url), tokens: new Set(["GLINT"]) },
  { label: "Credits", groupIcon: img(credits_icon_url), tokens: new Set(["CREDITS"]) },
  {
    label: "Voucher",
    groupIcon: img(voucher_icon_url),
    tokens: new Set(["VOUCHER", "VOUCHER-G", "UNCLAIMED_VOUCHER"]),
  },
];

function fmtNum(n: number): string {
  if (n === 0) return "0";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function cardImageMd(name: string, edition: number, foil: CardFoil): string {
  const imageUrl = getCardImageByLevel(name, edition, foil);
  return `![](${PROXY150}${imageUrl})`;
}

function cardGrid(cards: HiveBlogMarketCard[]): string {
  if (cards.length === 0) return "*None*";

  const entries: Array<{ name: string; edition: number; foil: CardFoil; count: number }> = [];
  for (const c of cards) {
    for (const [foil, count] of Object.entries(c.foilCounts)) {
      if (count && count > 0)
        entries.push({
          name: c.name,
          edition: c.edition,
          foil: (foil as CardFoil) ?? "regular",
          count,
        });
    }
  }

  if (entries.length === 0) return "*None*";

  const COLS = 5;
  const colCount = Math.min(COLS, entries.length);
  const header = Array.from({ length: colCount }, () => " ").join("|");
  const separator = Array.from({ length: colCount }, () => "-").join("|");
  const rows: string[] = [`|${header}|`, `|${separator}|`];

  for (let i = 0; i < entries.length; i += COLS) {
    const chunk = entries.slice(i, i + COLS);
    const cells = chunk.map((e) => ` ${cardImageMd(e.name, e.edition, e.foil)} <br> ${e.count}x `);
    while (cells.length < COLS) cells.push(" ");
    rows.push(`|${cells.join("|")}|`);
  }

  return rows.join("\n");
}

function buildIntroLines(seasonId: number): string[] {
  return [
    `![](${splinterlands_statistics_icon_url})`,
    "",
    `${SUB_HEADER} 📖 Introduction ${CLOSE_HEADER}`,
    "",
    `Here is my Season ${seasonId} report covering battle performance, earnings, rewards, tournaments and market activity.`,
    "",
    "Feel free to leave a comment, upvote, or share if you find this useful!",
    "",
  ];
}

function buildBattleSectionLines(acc: HiveBlogAccountData): string[] {
  const lines: string[] = [];
  lines.push(`${SUB_HEADER} ⚔️ Battle Results — @${acc.username}${CLOSE_HEADER}`, "");

  if (acc.leaderboard.length > 0) {
    lines.push(
      "| Format | League | Battles | Wins | Win% | Rating | Rank |",
      "|--------|--------|--------:|-----:|-----:|-------:|-----:|",
      ...acc.leaderboard.map((r) => {
        const leagueCell =
          r.leagueNum != null ? `${leagueIconMd(r.format, r.leagueNum)} ${r.league}` : r.league;
        return `| ${capitalize(r.format)} | ${leagueCell} | ${r.battles} | ${r.wins} | ${r.winPct}% | ${r.rating} | ${r.rank != null ? `#${r.rank}` : "—"} |`;
      }),
      ""
    );
  } else {
    lines.push("*No battle data found for this season.*", "");
  }
  return lines;
}

function buildTournamentSectionLines(acc: HiveBlogAccountData): string[] {
  if (acc.tournaments.length === 0) return [];
  const lines: string[] = [];
  lines.push(`${SUB_HEADER} 🏆 Tournaments — @${acc.username}${CLOSE_HEADER}`, "");
  lines.push(
    "| Tournament | League | Place | Players | W/L/D | Fee | Prize |",
    "|-----------|--------|------:|-------:|-------|-----|-------|",
    ...acc.tournaments.map(
      (t) =>
        `| ${t.name} | ${t.league} | ${t.finish != null ? `#${t.finish}` : "—"} | ${t.numPlayers} | ${t.wins}/${t.losses}/${t.draws} | ${t.entryFee} | ${t.prizeQty}${t.prizeType ? ` ${t.prizeType}` : ""} |`
    ),
    ""
  );
  return lines;
}

function buildRewardsSectionLines(acc: HiveBlogAccountData): string[] {
  if (!acc.rewards) return [];
  const r = acc.rewards;
  const lines: string[] = [];
  lines.push(`${SUB_HEADER} 🎁 Season Rewards — @${acc.username}${CLOSE_HEADER}`, "");

  // Chests opened
  if (r.minor + r.major + r.ultimate > 0) {
    lines.push(
      `| ![](${PROXY150}${reward_draw_minor_icon_url}) | ![](${PROXY150}${reward_draw_major_icon_url}) | ![](${PROXY150}${reward_draw_ultimate_icon_url}) |`,
      "|-|-|-|",
      `| Minor: ${r.minor}x | Major: ${r.major}x | Ultimate: ${r.ultimate}x | `,
      ""
    );
  }

  // Shop Purchases
  const hasShopOthers =
    r.shopPotions.gold + r.shopPotions.legendary + r.shopMerits + r.shopRankedEntries > 0;
  const hasShopScrolls =
    r.shopScrolls.common + r.shopScrolls.rare + r.shopScrolls.epic + r.shopScrolls.legendary > 0;

  lines.push(`${SUB_HEADER}**Shop Purchases**${CLOSE_HEADER}`, "");

  lines.push("*Chests*", "");
  const chestCells = [
    ` ![](${PROXY150}${reward_draw_minor_icon_url}) <br> minor <br> ${r.shopChestMinor}x `,
    ` ![](${PROXY150}${reward_draw_major_icon_url}) <br> major <br> ${r.shopChestMajor}x `,
    ` ![](${PROXY150}${reward_draw_ultimate_icon_url}) <br> ultimate <br> ${r.shopChestUltimate}x `,
  ];
  lines.push(`|${chestCells.join("|")}|`, "|-|-|-|", "");

  lines.push("*Rarity Draws*", "");
  const rarityDrawCells = [
    ` ![](${PROXY150}${reward_draw_common_icon_url}) <br> common <br> ${r.shopRarityDraws.common}x `,
    ` ![](${PROXY150}${reward_draw_rare_icon_url}) <br> rare <br> ${r.shopRarityDraws.rare}x `,
    ` ![](${PROXY150}${reward_draw_epic_icon_url}) <br> epic <br> ${r.shopRarityDraws.epic}x `,
    ` ![](${PROXY150}${reward_draw_legendary_icon_url}) <br> legendary <br> ${r.shopRarityDraws.legendary}x `,
  ];
  lines.push(`|${rarityDrawCells.join("|")}|`, "|-|-|-|-|", "");

  if (hasShopScrolls) {
    lines.push("*Scrolls*", "");
    const scrollIconMap: Record<string, string> = {
      common: unbind_ca_c_icon_url,
      rare: unbind_ca_r_icon_url,
      epic: unbind_ca_e_icon_url,
      legendary: unbind_ca_l_icon_url,
    };
    const scrollCells = (["common", "rare", "epic", "legendary"] as const)
      .filter((t) => r.shopScrolls[t] > 0)
      .map((t) => ` ![](${PROXY150}${scrollIconMap[t]}) <br> ${t} <br> ${r.shopScrolls[t]}x `);
    lines.push(`|${scrollCells.join("|")}|`, `|${scrollCells.map(() => "-").join("|")}|`, "");
  }

  if (hasShopOthers) {
    lines.push("*Others*", "", "| Item | Count |", "|-|-|");
    if (r.shopPotions.gold > 0)
      lines.push(`| ![](${PROXY20}${gold_icon_url}) Alchemy | ${r.shopPotions.gold}x |`);
    if (r.shopPotions.legendary > 0)
      lines.push(
        `| ![](${PROXY20}${legendary_icon_url}) Legendary | ${r.shopPotions.legendary}x |`
      );
    if (r.shopMerits > 0)
      lines.push(`| ![](${PROXY20}${merits_icon_url}) Merits (from chests) | ${r.shopMerits}x |`);
    if (r.shopRankedEntries > 0)
      lines.push(
        `| ![](${PROXY20}${ranked_entries_icon_url}) Ranked Entries | ${r.shopRankedEntries}x |`
      );
    lines.push("");
  }

  // Potions Used
  const potionIconMap: Record<string, string> = {
    gold: `![](${PROXY20}${gold_icon_url})`,
    legendary: `![](${PROXY20}${legendary_icon_url})`,
  };
  const potionsUsedEntries = Object.entries(r.potionsUsed).filter(([, v]) => v > 0);
  if (potionsUsedEntries.length > 0) {
    lines.push("**Potions Used**", "", "| Item | Count |", "|-|-|");
    for (const [type, count] of potionsUsedEntries) {
      const icon = potionIconMap[type] ?? "";
      const label = type === "gold" ? "Alchemy" : type === "legendary" ? "Legendary" : type;
      lines.push(`| ${icon} ${label} | ${count} |`);
    }
    lines.push("");
  }

  // Consumables Earned
  const potionEntries = Object.entries(r.potions).filter(([, v]) => v > 0);
  const scrollEntries = Object.entries(r.scrolls).filter(([, v]) => v > 0);
  if (potionEntries.length > 0 || scrollEntries.length > 0 || r.merits > 0 || r.energy > 0) {
    const scrollIconMap: Record<string, string> = {
      common_scroll: `![](${PROXY20}${unbind_ca_c_icon_url})`,
      rare_scroll: `![](${PROXY20}${unbind_ca_r_icon_url})`,
      epic_scroll: `![](${PROXY20}${unbind_ca_e_icon_url})`,
      legendary_scroll: `![](${PROXY20}${unbind_ca_l_icon_url})`,
    };
    lines.push("**Consumables Earned**", "", "| Item | Count |", "|-|-|");
    for (const [type, count] of potionEntries) {
      const icon = potionIconMap[type] ?? `![](${PROXY20}${gold_icon_url})`;
      const label =
        type === "gold"
          ? "Alchemy Potion"
          : type === "legendary"
            ? "Legendary Potion"
            : `${type} Potion`;
      lines.push(`| ${icon} ${label} | ${count} |`);
    }
    for (const [type, count] of scrollEntries) {
      const icon = scrollIconMap[type] ?? "";
      const label = type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`| ${icon} ${label} | ${count} |`);
    }
    if (r.merits > 0)
      lines.push(`| ![](${PROXY20}${merits_icon_url}) Merits | ${fmtNum(r.merits)} |`);
    if (r.energy > 0) lines.push(`| ![](${energy_icon_url}) Energy | ${fmtNum(r.energy)} |`);
    lines.push("");
  }

  // Packs Earned
  const packEntries = Object.entries(r.packs).filter(([, v]) => v > 0);
  if (packEntries.length > 0) {
    const packIconMap: Record<string, string> = {
      1: pack_beta_icon_url,
      7: pack_chaos_icon_url,
      8: pack_rift_icon_url,
      15: pack_foundations_icon_url,
    };
    const packNameMap: Record<string, string> = {
      1: "Beta",
      7: "Chaos Legion",
      8: "Riftwatchers",
      15: "Foundations",
    };
    lines.push("**Packs Earned**", "");
    const packCells = packEntries.map(([edition, count]) => {
      const iconUrl = packIconMap[edition] ?? pack_chaos_icon_url;
      const name = packNameMap[edition] ?? `Edition ${edition}`;
      return ` ![](${PROXY150}${iconUrl}) <br> ${name}: ${count}x `;
    });
    lines.push(`|${packCells.join("|")}|`, `|${packCells.map(() => "-").join("|")}|`, "");
  }

  // Fortune Draw Entries
  if (r.frontierEntries > 0 || r.rankedEntries > 0) {
    lines.push("**Fortune Draw Entries**", "");
    const entryCells: string[] = [];
    if (r.frontierEntries > 0)
      entryCells.push(
        ` ![](${PROXY50}${foundation_entries_icon_url}) Frontier <br> ${r.frontierEntries}x `
      );
    if (r.rankedEntries > 0)
      entryCells.push(
        ` ![](${PROXY50}${ranked_entries_icon_url}) Ranked  <br> ${r.rankedEntries}x `
      );
    lines.push(`|${entryCells.join("|")}|`, `|${entryCells.map(() => "-").join("|")}|`, "");
  }

  // Earned Cards
  if (r.earnedCards.length > 0) {
    lines.push("**Chests — Earned Cards**", "");
    const goldCards = r.earnedCards
      .filter((c) => (c.foilCounts["gold"] ?? 0) > 0)
      .map((c) => ({ ...c, foilCounts: { gold: c.foilCounts["gold"] } }));
    const regularCards = r.earnedCards
      .filter((c) => (c.foilCounts["regular"] ?? 0) > 0)
      .map((c) => ({ ...c, foilCounts: { regular: c.foilCounts["regular"] } }));
    if (goldCards.length > 0) lines.push("*Gold Rewards*", "", cardGrid(goldCards), "");
    if (regularCards.length > 0) lines.push("*Regular Rewards*", "", cardGrid(regularCards), "");
  }

  // Earned Skins
  if (r.earnedSkins.length > 0) {
    lines.push("**Chests — Earned Skins**", "");
    const skinCells = r.earnedSkins.map(
      (s) =>
        ` ${s.imageUrl ? `![](${PROXY150}${s.imageUrl})` : "🎨"} <br> ${s.skinName} <br> ${s.cardName} <br> ×${s.quantity} `
    );
    for (let i = 0; i < skinCells.length; i += 4) {
      const row = skinCells.slice(i, i + 4);
      lines.push(`|${row.join("|")}|`, `|${row.map(() => "-").join("|")}|`);
    }
    lines.push("");
  }

  // Earned Music
  if (r.earnedMusic.length > 0) {
    lines.push("**Chests — Earned Music**", "");
    const musicCells = r.earnedMusic.map(
      (m) =>
        ` ${m.imageUrl ? `![](${PROXY150}${m.imageUrl})` : "🎵"} <br> ${m.name} <br> ×${m.quantity} `
    );
    for (let i = 0; i < musicCells.length; i += 4) {
      const row = musicCells.slice(i, i + 4);
      lines.push(`|${row.join("|")}|`, `|${row.map(() => "-").join("|")}|`);
    }
    lines.push("");
  }

  return lines;
}

function buildEarningsSectionLines(acc: HiveBlogAccountData): string[] {
  const lines: string[] = [];
  lines.push(`${SUB_HEADER} 💰 Earnings — @${acc.username} ${CLOSE_HEADER}`, "");

  if (acc.earned.length === 0 && acc.costs.length === 0) {
    lines.push("*No earnings data found for this season.*", "");
    return lines;
  }

  const TABLE_HEADER = "| earn | <center>type</center> | cost |";
  const TABLE_SEP = "| --- | --- | --- |";

  const renderGroup = (label: string, groupIcon: string, groupTokens: Set<string>) => {
    const earnedRows = acc.earned.filter((r) => groupTokens.has(r.token));
    const costRows = acc.costs.filter((r) => groupTokens.has(r.token));
    if (earnedRows.length === 0 && costRows.length === 0) return;

    // Merge earned and cost by (token, label) so types with both show on one row
    const merged = new Map<
      string,
      { rowLabel: string; icon: string; earnAmt: number; costAmt: number }
    >();
    for (const e of earnedRows) {
      const key = `${e.token}:${e.label}`;
      if (!merged.has(key))
        merged.set(key, { rowLabel: e.label, icon: e.icon, earnAmt: 0, costAmt: 0 });
      merged.get(key)!.earnAmt += e.amount;
    }
    for (const c of costRows) {
      const key = `${c.token}:${c.label}`;
      if (!merged.has(key))
        merged.set(key, { rowLabel: c.label, icon: c.icon, earnAmt: 0, costAmt: 0 });
      merged.get(key)!.costAmt += c.amount;
    }

    lines.push(`**${groupIcon} ${label}**`, "", TABLE_HEADER, TABLE_SEP);
    for (const { rowLabel, icon, earnAmt, costAmt } of merged.values()) {
      const earnCell = earnAmt > 0 ? `${icon} ${fmtNum(earnAmt)}` : "-";
      const costCell = costAmt > 0 ? `${icon} ${fmtNum(costAmt)}` : "-";
      lines.push(`| ${earnCell} | <center>${rowLabel}</center> | ${costCell} |`);
    }
    lines.push("");
  };

  for (const group of EARNINGS_GROUPS) {
    renderGroup(group.label, group.groupIcon, group.tokens);
  }

  return lines;
}

function buildMarketSectionLines(acc: HiveBlogAccountData): string[] {
  const hasMarket =
    acc.boughtCards.length > 0 ||
    acc.soldCards.length > 0 ||
    acc.boughtItems.length > 0 ||
    acc.soldItems.length > 0;
  if (!hasMarket) return [];

  const lines: string[] = [];
  lines.push(`## 💳 Market — @${acc.username}`, "");

  if (acc.boughtCards.length > 0) lines.push("### Cards Bought", "", cardGrid(acc.boughtCards), "");
  if (acc.soldCards.length > 0) lines.push("### Cards Sold", "", cardGrid(acc.soldCards), "");
  if (acc.boughtItems.length > 0) {
    lines.push("### Items Bought", "", "| Item | Qty |", "|-|-|");
    for (const item of acc.boughtItems) lines.push(`| ${item.detailId} | ${item.quantity} |`);
    lines.push("");
  }
  if (acc.soldItems.length > 0) {
    lines.push("### Items Sold", "", "| Item | Qty |", "|-|-|");
    for (const item of acc.soldItems) lines.push(`| ${item.detailId} | ${item.quantity} |`);
    lines.push("");
  }

  return lines;
}

function buildClosingLines(): string[] {
  return [
    `${HEADER} Closing notes ${CLOSE_HEADER}`,
    "",
    "This report is generated with the splinterlands statistics tool from @beaker007  [SPL Stats](http://spl-stats.com/) ([git-repo](https://github.com/gamerbeaker007/spl-stats-next)).",
    "",
    `${SUB_HEADER}🙌 Support the Project ${CLOSE_HEADER}`,
    "",
    "✅ Upvote this post – it really helps!",
    "",
    "👉 [Vote for My SPS Validator Node](https://monstermarket.io/validators?validator=beaker007)",
    "",
    "💬 Drop a comment or idea – weird edge cases welcome.",
    "",
    "*10% of post rewards go to @beaker007*",
    "------",
    `![](${spl_logo_icon_url})`,
  ];
}

export function buildMarkdown(seasonId: number, accounts: HiveBlogAccountData[]): string {
  const accountMentions = accounts.map((a) => `@${a.username}`).join(", ");
  const lines: string[] = [];

  lines.push(
    `${HEADER} Season ${seasonId} Splinterlands Report for ${accountMentions} ${CLOSE_HEADER}`,
    ""
  );

  lines.push(...buildIntroLines(seasonId));

  for (const acc of accounts) {
    lines.push(
      ...buildBattleSectionLines(acc),
      ...buildTournamentSectionLines(acc),
      ...buildEarningsSectionLines(acc),
      ...buildRewardsSectionLines(acc),
      ...buildMarketSectionLines(acc),
      "---",
      ""
    );
  }

  lines.push(...buildClosingLines());

  return lines.join("\n");
}
