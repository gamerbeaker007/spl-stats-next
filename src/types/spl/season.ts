/** Season info returned by GET /season?id=N */
export interface SplSeasonInfo {
  id: number;
  ends: string; // ISO date string
}

/** Partial settings response from GET /settings — only what we need */
export interface SplSettings {
  season: {
    id: number;
    ends: string;
  };
  maintenance_mode: boolean;
  /** XP thresholds for BCX calculation — indexed by rarity-1 (0=Common … 3=Legendary). */
  alpha_xp?: number[];
  beta_xp?: number[];
  beta_gold_xp?: number[];
  gold_xp?: number[];
}
