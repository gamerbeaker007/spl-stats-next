export type CardWatch = {
  cardDetailId: number;
  /** SPL card edition; -1 marks a retained legacy watch with unknown edition. */
  edition: number;
  /** Index into `cardFoilOptions`. */
  foil: number;
  lowPriceBcxAtWatch: number;
  lowPriceAtWatch: number;
  watchedAt: Date;
};
