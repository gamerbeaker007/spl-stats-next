/** Partial player details from GET /players/details?name=X — only what we need */
export interface SplPlayerDetails {
  name: string;
  join_date: string; // ISO date string
}
