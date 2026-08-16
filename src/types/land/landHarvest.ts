export interface LandRegionHarvest {
  name: string;
  region_number: number;
  region_uid?: string;
  last_claimed: string | null; // ISO 8601 UTC timestamp or null
}

export interface LandHarvestData {
  username: string;
  regions: LandRegionHarvest[];
  /** ISO 8601 UTC timestamp of when this cache entry was populated. */
  fetchedAt: string;
}
