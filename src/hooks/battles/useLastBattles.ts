"use client";

import { getBattleEntriesAction } from "@/lib/backend/actions/battle-overview-actions";
import { useAsyncData } from "@/hooks/useAsyncData";
import type { DetailedBattleEntry } from "@/types/battles";

const NO_BATTLES: DetailedBattleEntry[] = [];

export function useLastBattles(account: string, battleIds: string[]) {
  const key =
    account && battleIds.length > 0 ? `last-battles:${account}:${battleIds.join(",")}` : null;
  const { data, loading } = useAsyncData(key, () => getBattleEntriesAction(account, battleIds), {
    keepPreviousData: false,
  });
  return { battles: data ?? NO_BATTLES, loading };
}
