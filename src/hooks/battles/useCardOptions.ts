"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { getCardOptionsAction } from "@/lib/backend/actions/battle-overview-actions";
import type { CardOption } from "@/types/card";

export type { CardOption };

const NO_CARDS: CardOption[] = [];

export function useCardOptions(account: string): { cards: CardOption[]; loading: boolean } {
  const { data, loading } = useAsyncData(account ? `card-options:${account}` : null, () =>
    getCardOptionsAction(account)
  );
  return { cards: data ?? NO_CARDS, loading };
}
