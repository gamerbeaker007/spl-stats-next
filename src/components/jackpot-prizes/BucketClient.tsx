"use client";

import { BucketOverview } from "@/components/jackpot-prizes/BucketOverview";
import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchCardCollection } from "@/lib/frontend/spl-browser-api";
import type { BucketCardEntry } from "@/types/jackpot-prizes/bucket";
import type { SplPlayerCard } from "@/types/spl/card";
import type { SplCardDetail } from "@/types/spl/cardDetails";
import { Alert, Box, CircularProgress } from "@mui/material";
import { useMemo } from "react";

interface Props {
  username: string;
  cardDetails: SplCardDetail[];
}

function makeBucketEntries(
  cards: SplPlayerCard[],
  cardDetails: SplCardDetail[]
): BucketCardEntry[] {
  const names = new Map(cardDetails.map((detail) => [detail.id, detail.name]));
  const bucket = new Map<number, Map<number, number>>();

  for (const card of cards) {
    let foils = bucket.get(card.card_detail_id);
    if (!foils) {
      foils = new Map();
      bucket.set(card.card_detail_id, foils);
    }
    foils.set(card.foil, (foils.get(card.foil) ?? 0) + 1);
  }

  return Array.from(bucket, ([cardDetailId, foilCounts]) => {
    const foils = Array.from(foilCounts, ([foil, count]) => ({ foil, count })).sort(
      (a, b) => a.foil - b.foil
    );
    return {
      card_detail_id: cardDetailId,
      name: names.get(cardDetailId) ?? `Card #${cardDetailId}`,
      foils,
      total: foils.reduce((sum, foil) => sum + foil.count, 0),
    };
  }).sort((a, b) => a.card_detail_id - b.card_detail_id);
}

export function BucketClient({ username, cardDetails }: Props) {
  const { data, loading, error, settledAt } = useAsyncData(
    `jackpot-bucket:${username}`,
    () => fetchCardCollection(username, { preserveCase: true }),
    { errorMessage: "Could not load prize bucket data" }
  );
  const cards = useMemo(
    () => (data ? makeBucketEntries(data.cards, cardDetails) : []),
    [data, cardDetails]
  );

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="warning">Could not load bucket data: {error}</Alert>
      </Box>
    );
  }
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <>
      <BucketOverview cards={cards} settledAt={settledAt} />
    </>
  );
}
