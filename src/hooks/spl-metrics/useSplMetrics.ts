import { getSplMetricsAction } from "@/lib/backend/actions/spl-metrics-actions";
import type { SplMetricRow } from "@/types/spl/metrics";
import { useEffect, useState } from "react";

export function useSplMetrics() {
  const [rows, setRows] = useState<SplMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getSplMetricsAction()
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load metrics"))
      .finally(() => setLoading(false));
  }, []);

  return { rows, loading, error };
}
