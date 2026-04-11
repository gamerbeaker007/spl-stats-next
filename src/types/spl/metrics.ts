export interface SplMetricValue {
  date: string; // ISO date string
  value: number;
}

export interface SplMetricEntry {
  metric: string;
  values: SplMetricValue[];
}

/** Flat row after the API response is normalised (one row per date+metric). */
export interface SplMetricRow {
  date: string;
  metric: string;
  value: number;
}
