import {
  type MarketplaceAssetMetaDetail,
  type MarketplaceAssetMetaDetailRaw,
  type MarketplaceAssetName,
  type MarketplaceAssetPrice,
  type MarketplaceLandingAsset,
  type MarketplaceLandingAssetRaw,
  type MarketplaceListingItem,
  type MarketplaceListingItemCurrency,
  type MarketplaceListingItemRaw,
  type MarketplaceSkinGroup,
  type MarketplaceSkinItem,
  marketplaceAssetNames,
} from "@/types/marketplace-assets";

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

export function buildMarketplaceSkinItems(
  landingAssets: MarketplaceLandingAsset[],
  metaDetails: MarketplaceAssetMetaDetail[]
): MarketplaceSkinItem[] {
  const landingById = new Map(landingAssets.map((asset) => [asset.detailId, asset]));

  return metaDetails
    .filter((detail) => detail.cardDetailId !== null)
    .map((detail) => {
      const landing = landingById.get(detail.id);
      if (!landing || landing.assetName !== "SKINS" || detail.cardDetailId === null) {
        return null;
      }

      return {
        assetName: "SKINS",
        detailId: detail.id,
        detailIdNumber: detail.idNumber,
        itemId: detail.id,
        cardDetailId: detail.cardDetailId,
        cardEditionIds: detail.cardEditionIds,
        imageCardEditionId: detail.imageCardEditionId,
        displayName: detail.name,
        baseCardName: detail.cardDetail?.name ?? detail.skinName,
        skinSet: detail.set,
        skinIdentifier: detail.set,
        skinName: detail.skinName,
        image: detail.image,
        icon: detail.icon,
        filterIcon: detail.filterIcon,
        description: detail.description || landing.detailDescription,
        rarity: detail.rarity,
        numCirculation: landing.numCirculation,
        numOwned: landing.numOwned,
        numListed: landing.numListed,
        prices: landing.prices,
      } satisfies MarketplaceSkinItem;
    })
    .filter((item): item is MarketplaceSkinItem => item !== null);
}

export function groupMarketplaceSkinsByCardDetailId(
  skins: MarketplaceSkinItem[]
): MarketplaceSkinGroup[] {
  const groups = new Map<number, MarketplaceSkinGroup>();

  for (const skin of skins) {
    const existing = groups.get(skin.cardDetailId);
    if (existing) {
      existing.skins.push(skin);
      continue;
    }

    groups.set(skin.cardDetailId, {
      cardDetailId: skin.cardDetailId,
      baseCardName: skin.baseCardName,
      skins: [skin],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      skins: [...group.skins].sort((left, right) =>
        left.displayName.localeCompare(right.displayName)
      ),
    }))
    .sort((left, right) => left.baseCardName.localeCompare(right.baseCardName));
}
