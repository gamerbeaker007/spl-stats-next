import type { MarketplaceAssetName } from "@/types/marketplace-assets";

/**
 * How a marketplace asset type is owned and traded on-chain, which decides the
 * list/transfer flow. Determined from the player inventory shape:
 *
 * - `"instance"` — one inventory row per copy, each with a unique `uid`; the
 *   marketplace `detailId` is numeric and equals the inventory `item_detail_id`
 *   (music, titles, totems, collector stickers, deeds). Listed/transferred per uid.
 * - `"skin"` — quantity-based and card-linked; uses the skin-specific transfer op
 *   that carries the base card id (skins only).
 * - `"quantity"` — fungible token: a single aggregate inventory row with a
 *   `quantity`, whose `uid` is the token symbol and equals the marketplace
 *   `detailId` (packs, consumables, totem fragments, land resources, land claims).
 *   Listed by symbol + quantity.
 *
 * Transfer support: all three models can transfer — `"instance"` per uid
 * (`sm_transfer_items`), `"skin"` via `sm_transfer_skins`, and `"quantity"` by
 * token quantity (`sm_token_transfer`).
 */
export type MarketplaceAssetModel = "instance" | "skin" | "quantity";

export const MARKETPLACE_ASSET_MODEL: Record<MarketplaceAssetName, MarketplaceAssetModel> = {
  SKINS: "skin",
  MUSIC: "instance",
  TITLES: "instance",
  TOTEMS: "instance",
  TOTEM_ITEMS: "instance",
  COLLECTOR_STICKERS: "instance",
  DEEDS: "instance",
  PACKS: "quantity",
  CONSUMABLES: "quantity",
  TOTEM_FRAGMENTS: "quantity",
  LAND_RESOURCES: "quantity",
  LAND: "quantity",
};
