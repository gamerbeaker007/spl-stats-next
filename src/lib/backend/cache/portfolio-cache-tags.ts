export const PORTFOLIO_CACHE_TAGS = {
  snapshots: (username: string) => `portfolio:snapshots:${username.toLowerCase()}`,
  investments: (username: string) => `portfolio:investments:${username.toLowerCase()}`,
} as const;
