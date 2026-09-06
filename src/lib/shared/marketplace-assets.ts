import { MARKETPLACE_ASSET_MODEL } from "@/lib/shared/marketplace-asset-model";
import {
  type MarketplaceAssetGroup,
  type MarketplaceAssetItem,
  type MarketplaceAssetMetaDetail,
  type MarketplaceAssetMetaDetailRaw,
  type MarketplaceAssetName,
  type MarketplaceAssetPrice,
  type MarketplaceLandingAsset,
  type MarketplaceLandingAssetRaw,
  type MarketplaceListingItem,
  type MarketplaceListingItemCurrency,
  type MarketplaceListingItemRaw,
  type MarketplacePlayerListing,
  type MarketplacePlayerListingRaw,
  type OutbidStatus,
  marketplaceAssetNames,
} from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";
import { SPL_URL, WEB_URL } from "../staticsIconUrls";

export const DEFAULT_SKIN_NAME = "";
export const DEFAULT_SKIN_DISPLAY_NAME = "Default";

/**
 * Numeric form of an asset detail id, or `NaN` when the id is non-numeric.
 * Many asset types have string ids (packs `"CHAOS"`, consumables `"MIDNIGHTPOT"`,
 * land resources `"TC"`, totem fragments `"TOTEMFC"`); only skins/music happen to
 * be numeric. This value is carried for numeric assets but never used to key
 * behaviour, so `NaN` for string ids is intentional and harmless.
 */
function toDetailIdNumber(value: string): number {
  return Number.parseInt(value, 10);
}

export function getListTooltip(
  assetName: string,
  availableToList: number,
  activeSkin: boolean,
  currentlyListed: number
): string {
  if (currentlyListed > 0) {
    return `View your listings`;
  }

  if (assetName !== "SKINS") {
    return availableToList < 1 ? "No quantity is available to list." : "List";
  }

  if (activeSkin && availableToList < 1) {
    return "The active copy cannot be listed, and no other copies are owned";
  }

  if (activeSkin) {
    return `1 active copy is locked. You can list up to ${availableToList}.`;
  }

  if (availableToList < 1) {
    return "No copies are available to list.";
  }

  return "List";
}

export function getActivateTooltip(
  assetName: string,
  actualOwned: number,
  currentlyListed: number,
  activeSkin: boolean
): string {
  if (assetName !== "SKINS") {
    return "No quantity is owned.";
  }

  if (actualOwned < 1) {
    return "No quantity is owned.";
  }

  if (activeSkin) {
    return "Already active";
  }

  if (actualOwned - currentlyListed < 1) {
    return "Owned copies are listed.";
  }

  return "Activate";
}

function normalizePrices(prices: MarketplaceAssetPrice[] | undefined): MarketplaceAssetPrice[] {
  if (!Array.isArray(prices)) return [];
  return prices
    .filter(
      (price) =>
        typeof price?.currency === "string" &&
        price.currency.trim().length > 0 &&
        typeof price.minPrice === "number" &&
        Number.isFinite(price.minPrice)
    )
    .map((price) => ({
      currency: price.currency,
      minPrice: price.minPrice,
    }));
}

export function parseMarketplaceAssetName(value: string): MarketplaceAssetName {
  if ((marketplaceAssetNames as readonly string[]).includes(value)) {
    return value as MarketplaceAssetName;
  }
  throw new Error(`Unsupported marketplace asset: ${value}`);
}

export function normalizeMarketplaceLandingAsset(
  raw: MarketplaceLandingAssetRaw,
  assetName: MarketplaceAssetName
): MarketplaceLandingAsset {
  const detailIdNumber = toDetailIdNumber(raw.detailId);

  return {
    assetName,
    assetDescription: raw.assetDescription ?? "",
    detailId: raw.detailId,
    detailIdNumber,
    detailName: raw.detailName,
    detailImage: raw.detailImage ?? null,
    detailIcon: raw.detailIcon ?? null,
    detailFilterIcon: raw.detailFilterIcon ?? null,
    detailDescription: raw.detailDescription ?? "",
    detailGroup: raw.detailGroup ?? "",
    detailRarity: typeof raw.detailRarity === "number" ? raw.detailRarity : null,
    numCirculation: typeof raw.numCirculation === "number" ? raw.numCirculation : 0,
    numOwned: typeof raw.numOwned === "number" ? raw.numOwned : 0,
    numListed: typeof raw.numListed === "number" ? raw.numListed : 0,
    prices: normalizePrices(raw.prices),
  };
}

export function normalizeMarketplaceAssetMetaDetail(
  raw: MarketplaceAssetMetaDetailRaw
): MarketplaceAssetMetaDetail {
  return {
    id: raw.id,
    idNumber: toDetailIdNumber(raw.id),
    name: raw.name,
    description: raw.description ?? "",
    image: raw.image ?? null,
    icon: raw.icon ?? null,
    filterIcon: raw.filterIcon ?? null,
    circulation: typeof raw.circulation === "number" ? raw.circulation : 0,
    printLimit: typeof raw.print_limit === "number" ? raw.print_limit : null,
    group: raw.group ?? "",
    rarity: typeof raw.rarity === "number" ? raw.rarity : null,
    cardDetailId: typeof raw.card_detail_id === "number" ? raw.card_detail_id : null,
    cardEditionIds: Array.isArray(raw.card_edition_ids)
      ? raw.card_edition_ids.filter((edition) => Number.isInteger(edition))
      : [],
    imageCardEditionId:
      typeof raw.image_card_edition_id === "number" ? raw.image_card_edition_id : null,
    set: raw.set ?? "",
    cardDetail: raw.card_detail ?? null,
    skinName: raw.skin_name ?? "",
  };
}

function findOtherCurrency(
  otherCurrencies: MarketplaceListingItemCurrency[],
  currency: string
): number | null {
  const match = otherCurrencies.find((entry) => entry.currency === currency);
  return typeof match?.price === "number" && Number.isFinite(match.price) ? match.price : null;
}

export function normalizeMarketplaceListingItem(
  raw: MarketplaceListingItemRaw,
  assetName: MarketplaceAssetName
): MarketplaceListingItem {
  const detailIdNumber = toDetailIdNumber(raw.detailId);
  const otherCurrencies = Array.isArray(raw.otherCurrencies)
    ? raw.otherCurrencies.filter(
        (entry) =>
          typeof entry?.currency === "string" &&
          entry.currency.trim().length > 0 &&
          typeof entry.price === "number" &&
          Number.isFinite(entry.price)
      )
    : [];

  return {
    assetName,
    listingId: raw.listingId,
    listingItemId: raw.listingItemId,
    seller: raw.player,
    currency: raw.currency,
    detailId: raw.detailId,
    detailIdNumber,
    itemId: raw.itemId,
    quantity: raw.quantity,
    quantityRemaining: raw.quantityRemaining,
    price: raw.price,
    createdDate: raw.createdDate,
    otherCurrencies,
    priceDec: findOtherCurrency(otherCurrencies, "DEC"),
    priceCredits: findOtherCurrency(otherCurrencies, "CREDITS"),
  };
}

export function normalizeMarketplacePlayerListing(
  raw: MarketplacePlayerListingRaw
): MarketplacePlayerListing {
  const assetName = parseMarketplaceAssetName(raw.assetName);
  const detailIdNumber = toDetailIdNumber(raw.detailId);

  return {
    listingId: raw.listingId,
    assetName,
    detailId: raw.detailId,
    detailIdNumber,
    quantity: typeof raw.quantity === "number" && Number.isFinite(raw.quantity) ? raw.quantity : 0,
    quantityRemaining:
      typeof raw.quantityRemaining === "number" && Number.isFinite(raw.quantityRemaining)
        ? raw.quantityRemaining
        : 0,
    status: typeof raw.status === "number" ? raw.status : 1,
    currency:
      typeof raw.currency === "string" && raw.currency.trim().length > 0 ? raw.currency : "USD",
    listingPrice:
      typeof raw.listingPrice === "number" && Number.isFinite(raw.listingPrice)
        ? raw.listingPrice
        : 0,
  };
}

/**
 * Compute per-skin outbid status by comparing the player's own active listing prices
 * against the global market minimum for each asset.
 *
 * A listing is outbid when a lower-priced competing listing exists (strict less-than).
 * Ties at the minimum price are NOT considered outbid.
 */
export function computeOutbidStatuses(
  playerListings: MarketplacePlayerListing[],
  items: MarketplaceAssetItem[],
  assetName: MarketplaceAssetName
): Map<string, OutbidStatus> {
  const result = new Map<string, OutbidStatus>();
  const itemByDetailId = new Map(items.map((item) => [item.detailId, item]));

  for (const listing of playerListings) {
    if (listing.assetName !== assetName) continue;
    if (listing.quantityRemaining < 1) continue;
    if (listing.listingPrice <= 0) continue;

    const item = itemByDetailId.get(listing.detailId);
    if (!item) continue;

    const marketPrice = item.prices.find((p) => p.currency === listing.currency);
    if (!marketPrice || !Number.isFinite(marketPrice.minPrice) || marketPrice.minPrice <= 0)
      continue;

    const isOutbid = marketPrice.minPrice < listing.listingPrice;
    const existing = result.get(listing.detailId);

    // Prefer showing outbid status; when not-outbid already recorded, keep it.
    if (!existing || (isOutbid && !existing.isOutbid)) {
      result.set(listing.detailId, {
        detailId: listing.detailId,
        myPrice: listing.listingPrice,
        currency: listing.currency,
        lowestMarketPrice: marketPrice.minPrice,
        isOutbid,
      });
    }
  }

  return result;
}

export function hasQuantityOwnership(
  itemOrAssetName: MarketplaceAssetName | Pick<MarketplaceAssetItem, "assetName">
): boolean {
  const assetName =
    typeof itemOrAssetName === "string" ? itemOrAssetName : itemOrAssetName.assetName;
  const model = MARKETPLACE_ASSET_MODEL[assetName];
  return model === "quantity" || model === "skin";
}

export function getActualOwnedQuantity(
  item: Pick<MarketplaceAssetItem, "actualOwned" | "numOwned">
): number {
  return Math.max(0, item.actualOwned ?? item.numOwned);
}

export function getCurrentlyListedQuantity(
  item: Pick<MarketplaceAssetItem, "currentlyListed">
): number {
  return Math.max(0, item.currentlyListed ?? 0);
}

export function getAvailableToListQuantity(
  item: Pick<MarketplaceAssetItem, "availableToList" | "assetName" | "actualOwned" | "numOwned">
): number {
  return Math.max(0, item.availableToList ?? getActualOwnedQuantity(item));
}

export function buildMarketplaceAssetItems(
  landingAssets: MarketplaceLandingAsset[],
  metaDetails: MarketplaceAssetMetaDetail[],
  assetName: MarketplaceAssetName
): MarketplaceAssetItem[] {
  const landingById = new Map(landingAssets.map((asset) => [asset.detailId, asset]));

  return metaDetails
    .map((detail): MarketplaceAssetItem | null => {
      const landing = landingById.get(detail.id);
      if (!landing || landing.assetName !== assetName) {
        return null;
      }

      const item: MarketplaceAssetItem = {
        assetName,
        detailId: detail.id,
        detailIdNumber: detail.idNumber,
        itemId: detail.id,
        displayName: detail.name,
        groupName: detail.cardDetail?.name ?? detail.skinName ?? detail.name,
        setName: detail.set,
        image: detail.image,
        icon: detail.icon,
        filterIcon: detail.filterIcon,
        description: detail.description || landing.detailDescription,
        rarity: detail.rarity,
        numCirculation: landing.numCirculation,
        ownedQuantity: landing.numOwned,
        actualOwned: landing.numOwned,
        currentlyListed: 0,
        availableToList: landing.numOwned,
        numOwned: landing.numOwned,
        numListed: landing.numListed,
        prices: landing.prices,
        cardDetailId: detail.cardDetailId,
        cardEditionIds: detail.cardEditionIds,
        imageCardEditionId: detail.imageCardEditionId,
        active: Boolean(false),
        baseSkin: false,
        activationSkinName: null,
      };

      return item;
    })
    .filter((item): item is MarketplaceAssetItem => item !== null);
}

function listingKey(assetName: MarketplaceAssetName, detailId: string): string {
  return `${assetName}:${detailId}`;
}

/**
 * Add the player's own marketplace-listed quantity back into quantity-based
 * ownership. `/market/landing` reports only locally held quantity for these
 * assets, while `/market/player/all_listings` reports quantity that still
 * belongs to the player but is currently listed.
 */
export function applyQuantityOwnership(
  items: MarketplaceAssetItem[],
  playerListings: MarketplacePlayerListing[]
): MarketplaceAssetItem[] {
  const listedByAssetDetail = new Map<string, number>();

  for (const listing of playerListings) {
    if (!hasQuantityOwnership(listing.assetName)) continue;
    const key = listingKey(listing.assetName, listing.detailId);
    const quantityRemaining = Math.max(0, listing.quantityRemaining);
    listedByAssetDetail.set(key, (listedByAssetDetail.get(key) ?? 0) + quantityRemaining);
  }

  return items.map((item) => {
    const ownedQuantity = Math.max(0, item.ownedQuantity ?? item.numOwned);

    if (!hasQuantityOwnership(item)) {
      return {
        ...item,
        ownedQuantity,
        actualOwned: ownedQuantity,
        currentlyListed: 0,
        availableToList: ownedQuantity,
        numOwned: ownedQuantity,
      };
    }

    const currentlyListed = listedByAssetDetail.get(listingKey(item.assetName, item.detailId)) ?? 0;
    const actualOwned = ownedQuantity + currentlyListed;
    const activeQuantity = item.assetName === "SKINS" && item.active ? 1 : 0;
    const availableToList = Math.max(0, actualOwned - currentlyListed - activeQuantity);

    return {
      ...item,
      ownedQuantity,
      actualOwned,
      currentlyListed,
      availableToList,
      numOwned: actualOwned,
    };
  });
}

/**
 * An owned inventory instance that can currently be listed or transferred:
 * not already listed, not in use/staked, and not soulbound. `can_transfer` is the
 * API's own eligibility flag — respect it when present.
 */
export function isActionableInventoryItem(item: {
  listed: boolean;
  in_use: boolean;
  is_soulbound?: boolean;
  can_transfer?: boolean;
}): boolean {
  return item.can_transfer !== false && !item.listed && !item.in_use && item.is_soulbound !== true;
}

/** Group card-linked assets (skins) by their base card. Items without a card link are skipped. */
export function groupMarketplaceAssetsByCardDetailId(
  items: MarketplaceAssetItem[]
): MarketplaceAssetGroup[] {
  const groups = new Map<number, MarketplaceAssetGroup>();

  for (const item of items) {
    if (item.cardDetailId === null) continue;

    const existing = groups.get(item.cardDetailId);
    if (existing) {
      existing.items.push(item);
      continue;
    }

    groups.set(item.cardDetailId, {
      cardDetailId: item.cardDetailId,
      groupName: item.groupName,
      items: [item],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) =>
        left.displayName.localeCompare(right.displayName)
      ),
    }))
    .sort((left, right) => left.groupName.localeCompare(right.groupName));
}

/** Human-readable "min per currency" price label (e.g. "1.20 DEC / 0.90 USD"). */
export function formatAssetPriceLabel(item: { prices: MarketplaceAssetPrice[] }): string {
  const labels = item.prices
    .filter((entry) => Number.isFinite(entry.minPrice) && entry.minPrice > 0)
    .map((entry) => `${entry.minPrice.toFixed(2)} ${entry.currency}`);

  return labels.length > 0 ? labels.join(" / ") : "No active listings";
}

export function getLowestPrice(item: MarketplaceAssetItem): number {
  const prices = item.prices
    .map((p) => p.minPrice)
    .filter((price) => Number.isFinite(price) && price > 0);

  return prices.length > 0 ? Math.min(...prices) : Number.POSITIVE_INFINITY;
}

/** Whether this SKINS row has an active copy for the selected player. */
export function isSkinActive(item: Pick<MarketplaceAssetItem, "assetName" | "active">): boolean {
  return item.assetName === "SKINS" && (item.active ?? false);
}

/**
 * Quantity available to newly list for a skin entry.
 * Formula: actual owned - own listed - active(0|1).
 */
export function getSkinListableQuantity(
  item: Pick<
    MarketplaceAssetItem,
    "assetName" | "numOwned" | "actualOwned" | "currentlyListed" | "availableToList" | "active"
  >
): number {
  if (item.assetName !== "SKINS") {
    return getAvailableToListQuantity(item);
  }

  return getAvailableToListQuantity(item);
}

/** Lowest USD price across an asset's price entries, or null if none. */
export function getLowestUsdPrice(prices: MarketplaceAssetPrice[]): number | null {
  const usdPrices = prices
    .filter(
      (entry) => entry.currency === "USD" && Number.isFinite(entry.minPrice) && entry.minPrice > 0
    )
    .map((entry) => entry.minPrice);

  return usdPrices.length > 0 ? Math.min(...usdPrices) : null;
}

export type MarketAssetSortField = "name" | "price";

export interface MarketAssetFilter {
  minPrice: number | null;
  maxPrice: number | null;
  listedOnly: boolean;
  /** Only show assets where at least one own active listing is undercut. */
  outbidOnly: boolean;
  sortBy: MarketAssetSortField;
  sortDir: "asc" | "desc";
}

export const DEFAULT_MARKET_ASSET_FILTER: MarketAssetFilter = {
  minPrice: null,
  maxPrice: null,
  listedOnly: false,
  outbidOnly: false,
  sortBy: "name",
  sortDir: "asc",
};

/** A price/listing filter is active (min, max, or listed-only) — as opposed to just sorting. */
export function isListingFilterActive(filter: MarketAssetFilter): boolean {
  return filter.minPrice !== null || filter.maxPrice !== null || filter.listedOnly;
}

/** Filter (price range + listed-only) and sort (name/price) a set of assets. */
export function applyMarketAssetFilters<
  T extends { displayName: string; numListed: number; prices: MarketplaceAssetPrice[] },
>(items: T[], filter: MarketAssetFilter): T[] {
  const priceOf = (item: T) => getLowestUsdPrice(item.prices);

  const filtered = items.filter((item) => {
    if (filter.listedOnly && item.numListed < 1) return false;
    const price = priceOf(item);
    if (filter.minPrice !== null && (price === null || price < filter.minPrice)) return false;
    if (filter.maxPrice !== null && (price === null || price > filter.maxPrice)) return false;
    return true;
  });

  return [...filtered].sort((left, right) => {
    let comparison: number;
    if (filter.sortBy === "price") {
      // Items without a listing sort last regardless of direction is handled by the caller's
      // listedOnly filter; here they compare as the highest price.
      const leftPrice = priceOf(left) ?? Number.POSITIVE_INFINITY;
      const rightPrice = priceOf(right) ?? Number.POSITIVE_INFINITY;
      comparison = leftPrice - rightPrice;
    } else {
      comparison = left.displayName.localeCompare(right.displayName);
    }
    return filter.sortDir === "asc" ? comparison : -comparison;
  });
}

/**
 * USD unit price of a listing. Every marketplace listing is USD-denominated
 * (`currency: "USD"`, `price` in USD); the `otherCurrencies` lookup is a fallback
 * for a listing quoted in something else.
 */
function toUsdUnitPrice(listing: MarketplaceListingItem): number | null {
  if (listing.currency === "USD" && Number.isFinite(listing.price)) return listing.price;
  return findOtherCurrency(listing.otherCurrencies, "USD");
}

export interface CheapestListingSelectionItem {
  listingItemId: number;
  quantity: number;
  /** USD cost of this line (USD unit price × quantity). */
  costUsd: number;
}

export interface CheapestListingSelection {
  /** listingItemId → quantity to buy from that listing (for UI selection highlight). */
  plan: Map<number, number>;
  /** Per-listing breakdown, priced in USD. */
  items: CheapestListingSelectionItem[];
  totalUsd: number;
  fulfilled: boolean;
}

/**
 * Greedily pick the cheapest listings (by USD unit price) to fulfil `quantity`,
 * skipping the buyer's own listings. Single source of truth shared by the client
 * (cost preview) and the server action (authoritative payload) so the quoted
 * price and the broadcast price can never diverge.
 *
 * Selection is always by USD — listings are USD-denominated, so USD order is the
 * true cheapest order regardless of which currency the buyer pays in. Converting
 * to the payment currency happens afterwards in `priceSelectionInCurrency`.
 */
export function selectCheapestListings(
  listings: MarketplaceListingItem[],
  quantity: number,
  account: string
): CheapestListingSelection {
  const normalizedAccount = account.trim().toLowerCase();

  const sorted = listings
    .filter((listing) => {
      const unit = toUsdUnitPrice(listing);
      const isOwnListing = listing.seller.trim().toLowerCase() === normalizedAccount;
      return unit !== null && listing.quantityRemaining > 0 && !isOwnListing;
    })
    .sort((left, right) => {
      const leftUnit = toUsdUnitPrice(left) ?? Number.MAX_SAFE_INTEGER;
      const rightUnit = toUsdUnitPrice(right) ?? Number.MAX_SAFE_INTEGER;
      return leftUnit - rightUnit;
    });

  const plan = new Map<number, number>();
  const items: CheapestListingSelectionItem[] = [];
  let remaining = quantity;
  let totalUsd = 0;

  for (const listing of sorted) {
    if (remaining <= 0) break;
    const buyQty = Math.min(remaining, listing.quantityRemaining);
    const unit = toUsdUnitPrice(listing);
    if (unit === null || buyQty < 1) continue;

    plan.set(listing.listingItemId, buyQty);
    items.push({
      listingItemId: listing.listingItemId,
      quantity: buyQty,
      costUsd: unit * buyQty,
    });
    totalUsd += unit * buyQty;
    remaining -= buyQty;
  }

  if (remaining > 0 || quantity < 1) {
    return { plan: new Map(), items: [], totalUsd: 0, fulfilled: false };
  }

  return { plan, items, totalUsd, fulfilled: true };
}

export interface PricedSelectionItem {
  listingItemId: number;
  quantity: number;
  currency: PurchaseCurrency;
  estimatedCost: number;
}

export interface PricedSelection {
  items: PricedSelectionItem[];
  totalCost: number;
}

/**
 * Convert a USD selection into the buyer's payment currency.
 *
 * USD is the source of truth and every currency is derived from it:
 * - `DEC` at `decPriceUsd` (USD per 1 DEC, from the prices API). Deliberately not
 *   the DEC price the marketplace API reports per listing — that value carries a
 *   uniform ~1.5–1.7% premium over the live DEC rate.
 * - `CREDITS` at the fixed 1000-per-USD peg.
 *
 * Amounts are rounded to 3 decimals: the precision the purchase payload is
 * broadcast with. Returns `null` when the DEC rate is unusable, so callers must
 * handle a missing rate rather than broadcast a zero-cost purchase.
 */
export function priceSelectionInCurrency(
  selection: CheapestListingSelection,
  currency: PurchaseCurrency,
  decPriceUsd: number | null
): PricedSelection | null {
  if (!selection.fulfilled) return null;

  let toCost: (costUsd: number) => number;
  if (currency === "DEC") {
    if (decPriceUsd === null || !Number.isFinite(decPriceUsd) || decPriceUsd <= 0) return null;
    toCost = (costUsd) => costUsd / decPriceUsd;
  } else {
    toCost = (costUsd) => costUsd * 1000;
  }

  const items = selection.items.map((item) => ({
    listingItemId: item.listingItemId,
    quantity: item.quantity,
    currency,
    estimatedCost: Number(toCost(item.costUsd).toFixed(3)),
  }));

  return {
    items,
    totalCost: Number(toCost(selection.totalUsd).toFixed(3)),
  };
}

export function getDeedImg(displayName: string) {
  const basePath = `${SPL_URL}assets/lands`;
  const surveyedBase = `${basePath}/deedsSurveyed`;
  const suffix = "_natural_common.jpg";

  if (displayName === "Unsurveyed Deed") return `${WEB_URL}website/land/deed_unsurveyed.jpg`;

  return `${surveyedBase}/${displayName.toLowerCase()}${suffix}`;
}
