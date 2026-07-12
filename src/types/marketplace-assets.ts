import type { SplCardDetail } from "@/types/spl/cardDetails";

export const marketplaceAssetNames = ["SKINS", "MUSIC"] as const;

export type MarketplaceAssetName = (typeof marketplaceAssetNames)[number];

export interface MarketplaceAssetPrice {
  currency: string;
  minPrice: number;
}

export interface MarketplaceLandingAssetRaw {
  assetName: string;
  assetDescription?: string;
  detailId: string;
  detailName: string;
  detailImage?: string;
  detailIcon?: string;
  detailFilterIcon?: string;
  detailDescription?: string;
  detailGroup?: string;
  detailRarity?: number;
  numCirculation?: number;
  numOwned?: number;
  numListed?: number;
  prices?: MarketplaceAssetPrice[];
}

export interface MarketplaceLandingAsset {
  assetName: MarketplaceAssetName;
  assetDescription: string;
  detailId: string;
  detailIdNumber: number;
  detailName: string;
  detailImage: string | null;
  detailIcon: string | null;
  detailFilterIcon: string | null;
  detailDescription: string;
  detailGroup: string;
  detailRarity: number | null;
  numCirculation: number;
  numOwned: number;
  numListed: number;
  prices: MarketplaceAssetPrice[];
}

export interface MarketplaceAssetMetaDetailRaw {
  id: string;
  name: string;
  description?: string;
  image?: string;
  icon?: string;
  filterIcon?: string;
  circulation?: number;
  print_limit?: number | null;
  group?: string;
  rarity?: number;
  card_detail_id?: number;
  card_edition_ids?: number[];
  image_card_edition_id?: number | null;
  set?: string;
  card_detail?: Pick<
    SplCardDetail,
    "id" | "name" | "type" | "sub_type" | "tier" | "rarity" | "editions"
  >;
  skin_name?: string;
}

export interface MarketplaceAssetMetaDetail {
  id: string;
  idNumber: number;
  name: string;
  description: string;
  image: string | null;
  icon: string | null;
  filterIcon: string | null;
  circulation: number;
  printLimit: number | null;
  group: string;
  rarity: number | null;
  cardDetailId: number | null;
  cardEditionIds: number[];
  imageCardEditionId: number | null;
  set: string;
  cardDetail: Pick<
    SplCardDetail,
    "id" | "name" | "type" | "sub_type" | "tier" | "rarity" | "editions"
  > | null;
  skinName: string;
}

export interface MarketplaceListingItemCurrency {
  currency: string;
  price: number;
}

export interface MarketplaceListingItemRaw {
  listingId: number;
  listingItemId: number;
  player: string;
  currency: string;
  detailId: string;
  itemId: string;
  quantity: number;
  quantityRemaining: number;
  price: number;
  createdDate: string;
  otherCurrencies: MarketplaceListingItemCurrency[];
}

export interface MarketplaceListingItem {
  assetName: MarketplaceAssetName;
  listingId: number;
  listingItemId: number;
  seller: string;
  currency: string;
  detailId: string;
  detailIdNumber: number;
  itemId: string;
  quantity: number;
  quantityRemaining: number;
  price: number;
  createdDate: string;
  otherCurrencies: MarketplaceListingItemCurrency[];
  priceDec: number | null;
  priceCredits: number | null;
}

export interface FetchMarketplaceListingItemsParams {
  assetName: MarketplaceAssetName;
  detailIds: string[];
  limit?: number;
  sort?: {
    field: "price" | "createdDate";
    order: "asc" | "desc";
  };
}

export interface MarketplaceListingItemsPage {
  items: MarketplaceListingItem[];
  total: number;
}

export interface MarketplaceSkinItem {
  assetName: "SKINS";
  detailId: string;
  detailIdNumber: number;
  itemId: string;
  cardDetailId: number;
  cardEditionIds: number[];
  imageCardEditionId: number | null;
  displayName: string;
  baseCardName: string;
  skinSet: string;
  skinIdentifier: string;
  skinName: string;
  image: string | null;
  icon: string | null;
  filterIcon: string | null;
  description: string;
  rarity: number | null;
  numCirculation: number;
  numOwned: number;
  numListed: number;
  prices: MarketplaceAssetPrice[];
}

export interface MarketplaceSkinGroup {
  cardDetailId: number;
  baseCardName: string;
  skins: MarketplaceSkinItem[];
}
