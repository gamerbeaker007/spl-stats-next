"use client";

import {
  getDistinctTokensAction,
  getSeasonTokenDetailAction,
  type TokenBalanceRow,
} from "@/lib/backend/actions/season-overview-actions";
import { useAsyncData } from "@/hooks/useAsyncData";

const NO_TOKENS: string[] = [];
const NO_ROWS: TokenBalanceRow[] = [];

export function useDistinctTokens(username?: string) {
  const { data, loading } = useAsyncData(`distinct-tokens:${username ?? ""}`, () =>
    getDistinctTokensAction(username)
  );
  return { tokens: data ?? NO_TOKENS, loading };
}

export function useTokenDetail(token: string, username?: string) {
  const { data, loading, error } = useAsyncData(
    token ? `token-detail:${token}:${username ?? ""}` : null,
    () => getSeasonTokenDetailAction(token, username)
  );
  return { data: data ?? NO_ROWS, loading, error };
}
