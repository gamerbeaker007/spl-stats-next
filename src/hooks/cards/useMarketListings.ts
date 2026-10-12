"use client";

import { type MarketListingRow, fetchMarketListingRows } from "@/lib/frontend/spl-browser-api";
import type { FetchMarketListingsByCardParams } from "@/types/purchase/purchase-plan";
import { useCallback, useState } from "react";

export function useMarketListings() {
  const [rows, setRows] = useState<MarketListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async (params: FetchMarketListingsByCardParams) => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchMarketListingRows(params);
      setRows(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load market listings";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    rows,
    loading,
    error,
    fetchRows,
  };
}
