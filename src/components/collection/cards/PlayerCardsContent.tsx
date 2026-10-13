"use client";

import { CardSection } from "@/components/collection/cards/CardSection";
import type { CardSort } from "@/components/collection/cards/card-sort";
import { loadDetailedCollection } from "@/lib/frontend/collection-data";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { DetailedPlayerCardCollection } from "@/types/card";
import type { CardWatch } from "@/types/card-watch";
import type { MarketPriceInfo } from "@/types/spl/market";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";

export function PlayerCardsContent({
  username,
  showHeader = false,
  selectableAccounts,
  showPrices,
  marketPrices,
  pricesFetchedAt,
  watches,
  onToggleWatch,
  watchedOnly,
  sort,
  onSortChange,
}: Readonly<{
  username: string;
  showHeader?: boolean;
  selectableAccounts?: string[];
  showPrices?: boolean;
  marketPrices?: Record<string, MarketPriceInfo>;
  pricesFetchedAt?: string;
  watches?: Record<string, CardWatch>;
  onToggleWatch?: (cardDetailId: number, edition: number, foil: number) => void;
  watchedOnly?: boolean;
  sort: CardSort;
  onSortChange: (sort: CardSort) => void;
}>) {
  const [cardCollection, setCardCollection] = useState<DetailedPlayerCardCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { collectionRefreshVersion } = usePurchasePlan();

  useEffect(() => {
    let active = true;
    const loadCards = async () => {
      setLoading(true);
      setError(null);
      try {
        const collection = await loadDetailedCollection(username, collectionRefreshVersion);
        if (active) setCardCollection(collection);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load card collection");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCards();
    return () => {
      active = false;
    };
  }, [username, collectionRefreshVersion]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!cardCollection) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No card collection data available
      </Alert>
    );
  }

  return (
    <Box>
      {showHeader && (
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, textAlign: "center" }}>
          {username}
        </Typography>
      )}
      <CardSection
        username={username}
        playerCards={cardCollection}
        selectableAccounts={selectableAccounts}
        showPrices={showPrices}
        marketPrices={marketPrices}
        pricesFetchedAt={pricesFetchedAt}
        watches={watches}
        onToggleWatch={onToggleWatch}
        watchedOnly={watchedOnly}
        sort={sort}
        onSortChange={onSortChange}
      />
    </Box>
  );
}
