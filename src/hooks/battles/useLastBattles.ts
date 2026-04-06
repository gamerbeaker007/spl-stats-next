"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBattleEntriesAction } from "@/lib/backend/actions/battle-overview-actions";
import type { DetailedBattleEntry } from "@/types/battles";

export function useLastBattles(account: string, battleIds: string[]) {
  const [battles, setBattles] = useState<DetailedBattleEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const idKey = battleIds.join(",");
  const idKeyRef = useRef(idKey);
  idKeyRef.current = idKey;

  const load = useCallback(async () => {
    setBattles([]);
    if (!account || battleIds.length === 0) return;
    setLoading(true);
    try {
      const result = await getBattleEntriesAction(account, battleIds);
      setBattles(result);
    } catch {
      setBattles([]);
    } finally {
      setLoading(false);
    }
    // idKey is stable across renders as long as the IDs don't change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, idKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { battles, loading };
}
