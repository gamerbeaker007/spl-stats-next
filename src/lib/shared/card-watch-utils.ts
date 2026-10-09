/** Percentage change from the watched price to the current price; null when either is unknown. */
export function pctChange(watched: number, current: number | undefined): number | null {
  if (!watched || !current) return null;
  return ((current - watched) / watched) * 100;
}

export function formatPct(pct: number): string {
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/** Green when the price dropped, red when it rose. */
export function pctColor(pct: number): string {
  if (pct > 0) return "error.main";
  if (pct < 0) return "success.main";
  return "text.secondary";
}
