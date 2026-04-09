"use client";

import { getLogsAction, type LogRow } from "@/lib/backend/actions/log-actions";
import type { LogLevel } from "@/lib/backend/db/logs";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 50;

export function useLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<LogLevel | undefined>();
  const [refreshCount, setRefreshCount] = useState(0);

  const pages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const result = await getLogsAction(page, level, PAGE_SIZE);
      if (result.success) {
        setLogs(result.logs);
        setTotal(result.total);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    load();
  }, [page, level, refreshCount]);

  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);

  const changeLevel = (next: LogLevel | undefined) => {
    setLevel(next);
    setPage(1); // reset to first page on filter change
  };

  return { logs, total, pages, loading, error, page, setPage, level, changeLevel, refresh };
}
