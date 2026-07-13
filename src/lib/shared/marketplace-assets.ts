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
  marketplaceAssetNames,
} from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";

function parseInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid numeric ${fieldName}: ${value}`);
  }
  return parsed;
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
  const detailIdNumber = parseInteger(raw.detailId, "detailId");

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
    idNumber: parseInteger(raw.id, "asset meta id"),
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
  const detailIdNumber = parseInteger(raw.detailId, "listing detailId");
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

export function buildMarketplaceAssetItems(
  landingAssets: MarketplaceLandingAsset[],
  metaDetails: MarketplaceAssetMetaDetail[],
  assetName: MarketplaceAssetName
): MarketplaceAssetItem[] {
  const landingById = new Map(landingAssets.map((asset) => [asset.detailId, asset]));

  return metaDetails
    .map((detail) => {
      const landing = landingById.get(detail.id);
      if (!landing || landing.assetName !== assetName) {
        return null;
      }

      return {
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
        numOwned: landing.numOwned,
        numListed: landing.numListed,
        prices: landing.prices,
        cardDetailId: detail.cardDetailId,
        cardEditionIds: detail.cardEditionIds,
        imageCardEditionId: detail.imageCardEditionId,
      } satisfies MarketplaceAssetItem;
    })
    .filter((item): item is MarketplaceAssetItem => item !== null);
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
  sortBy: MarketAssetSortField;
  sortDir: "asc" | "desc";
}

export const DEFAULT_MARKET_ASSET_FILTER: MarketAssetFilter = {
  minPrice: null,
  maxPrice: null,
  listedOnly: false,
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

function toUnitPrice(listing: MarketplaceListingItem, currency: PurchaseCurrency): number | null {
  if (currency === "DEC") return listing.priceDec;
  if (currency === "CREDITS") return listing.priceCredits;
  return null;
}

export interface CheapestListingSelectionItem {
  listingItemId: number;
  quantity: number;
  estimatedCost: number;
}

export interface CheapestListingSelection {
  /** listingItemId → quantity to buy from that listing (for UI selection highlight). */
  plan: Map<number, number>;
  /** Per-listing breakdown used to build the purchase payload. */
  items: CheapestListingSelectionItem[];
  totalCost: number;
  fulfilled: boolean;
}

/**
 * Greedily pick the cheapest listings (by unit price in `currency`) to fulfil
 * `quantity`, skipping the buyer's own listings. Single source of truth shared by
 * the client (cost preview) and the server action (authoritative payload) so the
 * quoted price and the broadcast price can never diverge.
 */
export function selectCheapestListings(
  listings: MarketplaceListingItem[],
  quantity: number,
  currency: PurchaseCurrency,
  account: string
): CheapestListingSelection {
  const normalizedAccount = account.trim().toLowerCase();

  const sorted = listings
    .filter((listing) => {
      const unit = toUnitPrice(listing, currency);
      const isOwnListing = listing.seller.trim().toLowerCase() === normalizedAccount;
      return unit !== null && listing.quantityRemaining > 0 && !isOwnListing;
    })
    .sort((left, right) => {
      const leftUnit = toUnitPrice(left, currency) ?? Number.MAX_SAFE_INTEGER;
      const rightUnit = toUnitPrice(right, currency) ?? Number.MAX_SAFE_INTEGER;
      return leftUnit - rightUnit;
    });

  const plan = new Map<number, number>();
  const items: CheapestListingSelectionItem[] = [];
  let remaining = quantity;
  let totalCost = 0;

  for (const listing of sorted) {
    if (remaining <= 0) break;
    const buyQty = Math.min(remaining, listing.quantityRemaining);
    const unit = toUnitPrice(listing, currency);
    if (unit === null || buyQty < 1) continue;

    const estimatedCost = Number((unit * buyQty).toFixed(3));
    plan.set(listing.listingItemId, buyQty);
    items.push({ listingItemId: listing.listingItemId, quantity: buyQty, estimatedCost });
    totalCost += unit * buyQty;
    remaining -= buyQty;
  }

  if (remaining > 0 || quantity < 1) {
    return { plan: new Map(), items: [], totalCost: 0, fulfilled: false };
  }

  return { plan, items, totalCost: Number(totalCost.toFixed(3)), fulfilled: true };
}
