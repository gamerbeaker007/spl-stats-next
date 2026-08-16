import { getPlayerLandHarvest } from "@/lib/backend/actions/player-actions";
import type { LandHarvestData } from "@/types/land/landHarvest";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseLandHarvestReturn {
  data: LandHarvestData | null;
  loading: boolean;
  error: string | null;
  fetchLandHarvest: () => Promise<void>;
}

export function useLandHarvest(username: string): UseLandHarvestReturn {
  const [data, setData] = useState<LandHarvestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchLandHarvest = useCallback(async () => {
    if (!username?.trim()) return;
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getPlayerLandHarvest(username);
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch land harvest data");
        setData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [username]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLandHarvest();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLandHarvest]);

  return { data, loading, error, fetchLandHarvest };
}
