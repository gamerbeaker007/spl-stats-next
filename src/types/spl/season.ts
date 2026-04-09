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
}
