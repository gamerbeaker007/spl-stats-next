"use client";

import {
  getDistinctTokensAction,
  getSeasonTokenDetailAction,
  type TokenBalanceRow,
} from "@/lib/backend/actions/season-overview-actions";
import { useCallback, useEffect, useState } from "react";

export function useDistinctTokens(username?: string) {
  const [tokens, setTokens] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getDistinctTokensAction(username);
      setTokens(t);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return { tokens, loading };
}

export function useTokenDetail(token: string, username?: string) {
  const [data, setData] = useState<TokenBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await getSeasonTokenDetailAction(token, username);
      setData(rows);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [token, username]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}
