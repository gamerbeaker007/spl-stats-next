"use client";

import { getNemesisDataAction } from "@/lib/backend/actions/nemesis-actions";
import { useAsyncData } from "@/hooks/useAsyncData";
import { NemesisData } from "@/types/battles";
import { UnifiedCardFilter } from "@/types/card-filter";

interface UseNemesisReturn {
  data: NemesisData | null;
  loading: boolean;
  error: string | null;
}

export function useNemesis(filter: UnifiedCardFilter): UseNemesisReturn {
  const { data, loading, error } = useAsyncData(
    filter.account ? `nemesis:${JSON.stringify(filter)}` : null,
    () => getNemesisDataAction(filter),
    { errorMessage: "Unknown error" }
  );
  return { data: data ?? null, loading, error };
}
