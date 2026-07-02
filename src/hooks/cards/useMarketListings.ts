"use client";

import { getMarketListingsByCardAction } from "@/lib/backend/actions/purchase-actions";
import type { FetchMarketListingsByCardParams } from "@/types/purchase/purchase-plan";
import { useCallback, useState } from "react";

interface MarketListingRow {
  marketId: string;
  uid?: string;
  cardDetailId: number;
  edition: number;
  foil: number;
  level: number;
  cc: number;
  priceUsd: number;
  priceDec: number;
  priceCredits: number;
  pricePerCcDec: number;
  seller?: string;
}

export function useMarketListings() {
  const [rows, setRows] = useState<MarketListingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async (params: FetchMarketListingsByCardParams) => {
    setLoading(true);
    setError(null);
    try {
      const next = await getMarketListingsByCardAction(params);
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
