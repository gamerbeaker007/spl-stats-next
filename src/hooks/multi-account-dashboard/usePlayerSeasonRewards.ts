"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchCurrentRewards } from "@/lib/frontend/spl-browser-api";
import { SPLSeasonRewards } from "@/types/spl/seasonRewards";
import { useState } from "react";

const AUTO_RETRY_DELAY_MS = 8_000;
const MAX_AUTO_RETRIES = 3;

export interface UsePlayerSeasonRewardsReturn {
  seasonRewards: SPLSeasonRewards | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

export function usePlayerSeasonRewards(
  username: string,
  options?: { enabled?: boolean }
): UsePlayerSeasonRewardsReturn {
  const enabled = options?.enabled ?? true;
  const key = enabled && username?.trim() ? `season-rewards:${username}` : null;
  const [retryNotice, setRetryNotice] = useState<{ key: string; message: string } | null>(null);

  const { data, loading, error, refetch } = useAsyncData(key, async (signal) => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fetchCurrentRewards(username);
      } catch {
        if (attempt > MAX_AUTO_RETRIES) throw new Error("Unable to fetch data within 10s");
        if (key) {
          setRetryNotice({
            key,
            message: `Season glint unavailable — retrying (${attempt}/${MAX_AUTO_RETRIES})`,
          });
        }
        await delay(AUTO_RETRY_DELAY_MS, signal);
      }
    }
  });

  const retrying = loading && retryNotice !== null && retryNotice.key === key;
  return {
    seasonRewards: data ?? null,
    loading,
    error: retrying ? retryNotice.message : error,
    refetch,
  };
}
