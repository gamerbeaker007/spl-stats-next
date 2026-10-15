"use client";

import { useAuthenticatedData } from "@/hooks/useAuthenticatedData";
import { getPlayerLandHarvest } from "@/lib/backend/actions/player-actions";
import type { SectionAuthState } from "@/lib/shared/authenticated-result";
import type { LandHarvestData } from "@/types/land/landHarvest";

interface UseLandHarvestReturn {
  data: LandHarvestData | null;
  loading: boolean;
  /** Genuine failures only — an unusable token reports through `authState`. */
  error: string | null;
  authState: SectionAuthState | null;
  fetchLandHarvest: () => Promise<void>;
}

export function useLandHarvest(
  username: string,
  options?: { enabled?: boolean }
): UseLandHarvestReturn {
  const { refetch, ...rest } = useAuthenticatedData(
    "land-harvest",
    username,
    getPlayerLandHarvest,
    { enabled: options?.enabled, errorMessage: "Failed to fetch land harvest data" }
  );
  return { ...rest, fetchLandHarvest: refetch };
}
