export interface BucketFoilCount {
  foil: number;
  count: number;
}

export interface BucketCardEntry {
  card_detail_id: number;
  name: string;
  foils: BucketFoilCount[];
  total: number;
}
