"use client";

import { getBuyMissingCcSharedDataAction } from "@/lib/backend/actions/buy-missing-cc-actions";
import type { SplCardDetail } from "@/types/spl/cardDetails";
import type { SplSettings } from "@/types/spl/season";
import { useEffect, useState } from "react";

type BuyMissingCcSharedDataState = {
  cardDetails: SplCardDetail[];
  settings: SplSettings | null;
  loading: boolean;
  error: string | null;
};

export function useBuyMissingCcSharedData(): BuyMissingCcSharedDataState {
  const [cardDetails, setCardDetails] = useState<SplCardDetail[]>([]);
  const [settings, setSettings] = useState<SplSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getBuyMissingCcSharedDataAction();
        if (!active) return;
        setCardDetails(data.cardDetails);
        setSettings(data.settings);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load shared Buy Missing CC data");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return {
    cardDetails,
    settings,
    loading,
    error,
  };
}
