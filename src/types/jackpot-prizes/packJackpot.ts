// types/packJackpot.ts
export interface FoilStats {
  foil: number;
  minted: number;
  total: number;
}

export interface PackJackpotCard {
  card_detail_id: number;
  total_minted: number;
  total: number;
  foils: FoilStats[];
}
