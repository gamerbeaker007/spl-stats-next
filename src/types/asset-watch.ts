export type AssetWatch = {
  assetName: string;
  detailId: string;
  /** Lowest USD price when the item was watched (0 when unknown). */
  priceAtWatch: number;
  watchedAt: Date;
};
