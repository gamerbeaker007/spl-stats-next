/** Shared minimum height (px) for all portfolio Plotly charts. */
export const PORTFOLIO_CHART_HEIGHT = 800;

/** Cycling series palette for the per-edition / per-item portfolio charts. */
export const SERIES_COLORS = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
  "#1f77b4",
  "#2ca02c",
];

/** Above this many series the legend is hidden and series are identified via hover only. */
export const MAX_LEGEND_ITEMS = 10;

/** First date where `hasData` holds, so the x-axis skips leading empty days. */
export function firstDateWithData<T extends { date: string }>(
  points: T[],
  hasData: (point: T) => boolean
): string | undefined {
  return points.find(hasData)?.date ?? points[0]?.date;
}
