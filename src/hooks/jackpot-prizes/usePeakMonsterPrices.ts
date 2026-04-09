"use client";

import {
  getPeakMonsterPricesAction,
  getPeakMonsterTopBidsAction,
} from "@/lib/backend/actions/jackpot-prizes/peakMonsterPrices";
import { useCallback, useEffect, useState } from "react";
import { PKBid, PKPrice } from "../../types/jackpot-prizes/pkPrices";

interface UsePeakMonsterPricesReturn {
  prices: PKPrice[];
  bids: PKBid[];
  loading: boolean;
  error: string | null;
  getPriceForCard: (cardDetailId: number, foil: number) => PKPrice | null;
  getTopBidForCard: (cardDetailId: number, foil: number) => PKBid | null;
}

export function usePeakMonsterPrices(): UsePeakMonsterPricesReturn {
  const [prices, setPrices] = useState<PKPrice[]>([]);
  const [bids, setBids] = useState<PKBid[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [pricesData, bidsData] = await Promise.all([
          getPeakMonsterPricesAction(),
          getPeakMonsterTopBidsAction(),
        ]);
        if (!cancelled) {
          setPrices(pricesData.prices ?? []);
          setBids(bidsData.bids ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setError(message);
          console.error("usePeakMonsterPrices error:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const getPriceForCard = useCallback(
    (cardDetailId: number, foil: number): PKPrice | null => {
      return prices.find((p) => p.card_detail_id === cardDetailId && p.foil === foil) ?? null;
    },
    [prices]
  );

  const getTopBidForCard = useCallback(
    (cardDetailId: number, foil: number): PKBid | null => {
      const cardBids = bids.filter((b) => b.card_detail_id === cardDetailId && b.foil === foil);
      if (cardBids.length === 0) return null;
      return cardBids.reduce((best, b) => (b.usd_price > best.usd_price ? b : best));
    },
    [bids]
  );

  return { prices, bids, loading, error, getPriceForCard, getTopBidForCard };
}
