/**
 * Central place for in-game item image URL construction.
 *
 * Items are identified by their `detailId` string (e.g. "MIDNIGHTPOT").
 * The SPL CDN does not expose a generic pattern for all item image paths,
 * so this file maintains a static lookup map with a fallback icon.
 *
 * Add new detailId → URL entries here as new items are discovered in
 * market history (the MarketHistoryTest component shows unfamiliar detailIds).
 */

import {
  WEB_URL,
  other_icon_url,
  gold_icon_url,
  legendary_icon_url,
  midnight_icon_url,
  merits_icon_url,
  pack_beta_icon_url,
  pack_chaos_icon_url,
  pack_rift_icon_url,
  pack_foundations_icon_url,
  unbind_ca_c_icon_url,
  unbind_ca_r_icon_url,
  unbind_ca_e_icon_url,
  unbind_ca_l_icon_url,
  energy_icon_url,
  ranked_entries_icon_url,
  foundation_entries_icon_url,
} from "@/lib/staticsIconUrls";

// ---------------------------------------------------------------------------
// Static image map  (detailId → CDN URL)
// ---------------------------------------------------------------------------

export const ITEM_IMAGE_MAP: Record<string, string> = {
  // Potions
  MIDNIGHTPOT: midnight_icon_url,
  GOLDPOT: gold_icon_url,
  LEGENDPOT: legendary_icon_url,

  // Unbind scrolls
  COMMON_SCROLL: unbind_ca_c_icon_url,
  RARE_SCROLL: unbind_ca_r_icon_url,
  EPIC_SCROLL: unbind_ca_e_icon_url,
  LEGENDARY_SCROLL: unbind_ca_l_icon_url,

  // Packs
  BETA_PACK: pack_beta_icon_url,
  CHAOS_PACK: pack_chaos_icon_url,
  RIFT_PACK: pack_rift_icon_url,
  FOUNDATION_PACK: pack_foundations_icon_url,

  // Other consumables
  MERITS: merits_icon_url,
  ENERGY: energy_icon_url,
  RANKED_ENTRY: ranked_entries_icon_url,
  FRONTIER_ENTRY: foundation_entries_icon_url,

  // Skins (generic placeholder — specific skin images require a skin name)
  SKIN: `${WEB_URL}website/icons/icon_title_proven.svg`,
};

// ---------------------------------------------------------------------------
// Display name map  (detailId → human label)
// ---------------------------------------------------------------------------

export const ITEM_DISPLAY_NAME: Record<string, string> = {
  MIDNIGHTPOT: "Midnight Potion",
  GOLDPOT: "Alchemy Potion",
  LEGENDPOT: "Legendary Potion",
  COMMON_SCROLL: "Common Scroll",
  RARE_SCROLL: "Rare Scroll",
  EPIC_SCROLL: "Epic Scroll",
  LEGENDARY_SCROLL: "Legendary Scroll",
  BETA_PACK: "Beta Pack",
  CHAOS_PACK: "Chaos Legion Pack",
  RIFT_PACK: "Riftwatchers Pack",
  FOUNDATION_PACK: "Foundations Pack",
  MERITS: "Merits",
  ENERGY: "Energy",
  RANKED_ENTRY: "Ranked Entry",
  FRONTIER_ENTRY: "Frontier Entry",
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * CDN image URL for an in-game item by its detailId.
 * Falls back to a generic item icon for unknown detailIds.
 */
export function getItemImageUrl(detailId: string): string {
  return ITEM_IMAGE_MAP[detailId] ?? other_icon_url;
}

/** Human-readable display name for an item detailId (falls back to the detailId itself). */
export function getItemDisplayName(detailId: string): string {
  return ITEM_DISPLAY_NAME[detailId] ?? detailId;
}
