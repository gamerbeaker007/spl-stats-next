// Portfolio domain types — shared between server and client.

export interface CollectionEditionDetail {
  edition: number;
  listValue: number;
  marketValue: number;
  bcx: number;
  numberOfCards: number;
}

export interface DeedDetail {
  rarity: string;
  plotStatus: string;
  magicType: string;
  deedType: string;
  qty: number;
  minListingPrice: number;
}

export interface LandResourceDetail {
  resource: string;
  qty: number;
  value: number;
}

export interface InventoryItemDetail {
  name: string;
  assetName: string; // e.g. "PACKS" | "SKINS" | item type
  qty: number;
  value: number;
}

/** Full computed portfolio for a single account on a single day. */
export interface PortfolioData {
  date: Date;
  username: string;

  // Collection
  collectionMarketValue: number;
  collectionListValue: number;
  collectionDetails: CollectionEditionDetail[];

  // Core named tokens
  decValue: number;
  decQty: number;
  decStakedValue: number;
  decStakedQty: number;
  spsValue: number;
  spsQty: number;
  spspValue: number;
  spspQty: number;
  voucherValue: number;
  voucherQty: number;
  creditsValue: number;
  creditsQty: number;
  decBValue: number;
  decBQty: number;
  voucherGValue: number;
  voucherGQty: number;
  licenseValue: number;
  licenseQty: number;

  // Land deeds
  deedsValue: number;
  deedsQty: number;
  deedDetails: DeedDetail[];

  // Land resources
  landResourceValue: number;
  landResourceQty: number;
  landResourceDetailed: LandResourceDetail[];

  // DEC:SPS liquidity pool
  liqPoolDecValue: number;
  liqPoolDecQty: number;
  liqPoolSpsValue: number;
  liqPoolSpsQty: number;

  // Inventory items (packs, skins, totems, etc.)
  inventoryValue: number;
  inventoryQty: number;
  inventoryDetail: InventoryItemDetail[];

  // Price snapshot
  decPriceUsd: number;
  hivePriceUsd: number;
  spsPriceUsd: number;
}
