import { getPlayersCardCollection } from "@/lib/backend/actions/player-actions";
import { PlayerCardCollectionData } from "@/types/playerCardCollection";
import { useCallback, useState } from "react";

export interface UsePlayerCardCollectionOptions {
  enabled?: boolean;
}

export interface UsePlayerCardCollectionReturn {
  data: PlayerCardCollectionData | null;
  loading: boolean;
  error: string | null;
  fetchPlayerCardCollection: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePlayerCardCollection(
  username: string,
  options?: UsePlayerCardCollectionOptions
): UsePlayerCardCollectionReturn {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<PlayerCardCollectionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayerCardCollection = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    try {
      const result = await getPlayersCardCollection(username);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch player status";
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [username, enabled]);

  const refetch = useCallback(async () => {
    await fetchPlayerCardCollection();
  }, [fetchPlayerCardCollection]);

  return {
    data,
    loading,
    error,
    fetchPlayerCardCollection,
    refetch,
  };
}
