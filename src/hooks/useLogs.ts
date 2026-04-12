"use client";

import { getLogsAction, type LogRow } from "@/lib/backend/actions/log-actions";
import type { LogLevel } from "@/lib/backend/db/logs";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

export function useLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<LogLevel | undefined>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pages = Math.ceil(total / PAGE_SIZE);

  // Debounce raw search input → debouncedSearch used in the fetch effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const result = await getLogsAction(page, level, PAGE_SIZE, debouncedSearch || undefined);
      if (result.success) {
        setLogs(result.logs);
        setTotal(result.total);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    load();
  }, [page, level, debouncedSearch, refreshCount]);

  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);

  const changeLevel = (next: LogLevel | undefined) => {
    setLevel(next);
    setPage(1);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    // page reset happens inside the debounce effect
  };

  return { logs, total, pages, loading, error, page, setPage, level, changeLevel, search, changeSearch, refresh };
}
