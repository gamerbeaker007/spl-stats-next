"use client";

import { getNemesisDataAction } from "@/lib/backend/actions/nemesis-actions";
import { NemesisData } from "@/types/battles";
import { useCallback, useEffect, useState } from "react";
import { UnifiedCardFilter } from "@/types/card-filter";

interface UseNemesisReturn {
  data: NemesisData | null;
  loading: boolean;
  error: string | null;
}

export function useNemesis(filter: UnifiedCardFilter): UseNemesisReturn {
  const [data, setData] = useState<NemesisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!filter.account) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getNemesisDataAction(filter);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error };
}
