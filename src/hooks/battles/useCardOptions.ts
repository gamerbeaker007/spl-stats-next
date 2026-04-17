"use client";

import { getCardOptionsAction } from "@/lib/backend/actions/battle-overview-actions";
import type { CardOption } from "@/types/card";
import { useCallback, useEffect, useRef, useState } from "react";

export type { CardOption };

export function useCardOptions(account: string): { cards: CardOption[]; loading: boolean } {
  const [cards, setCards] = useState<CardOption[]>([]);
  const [loading, setLoading] = useState(false);
  const accountRef = useRef(account);
  accountRef.current = account;

  const fetchCards = useCallback(async () => {
    const acc = accountRef.current;
    if (!acc) {
      setCards([]);
      return;
    }
    setLoading(true);
    try {
      const result = await getCardOptionsAction(acc);
      setCards(result);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [account, fetchCards]);

  return { cards, loading };
}
