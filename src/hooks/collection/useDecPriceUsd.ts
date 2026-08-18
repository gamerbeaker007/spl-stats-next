"use client";

import { getDecPriceUsdAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { useEffect, useState } from "react";

interface DecPriceState {
  decPriceUsd: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Live USD-per-DEC rate for marketplace cost previews. `decPriceUsd` is `null`
 * until loaded, and on failure, so callers render "N/A" instead of a wrong DEC
 * amount.
 *
 * Preview only: the purchase action re-reads the rate server-side before
 * building the payload, so the broadcast amount never depends on this value.
 */
export function useDecPriceUsd(enabled = true) {
  const [state, setState] = useState<DecPriceState>({
    decPriceUsd: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    getDecPriceUsdAction()
      .then((next) => {
        if (active) setState({ decPriceUsd: next, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (active) {
          setState({
            decPriceUsd: null,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to load DEC price",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return state;
}
