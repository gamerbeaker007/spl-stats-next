"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Container, Divider, Stack, Typography } from "@mui/material";

import { BucketOverview } from "@/components/jackpot-prizes/BucketOverview";

import type { SplCardDetail } from "@/types/spl/cardDetails";
import type { BucketCardEntry } from "@/types/jackpot-prizes/bucket";

import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchCAGoldRewardsCards } from "@/lib/frontend/spl-browser-api";
import RarityFilter from "@/components/jackpot-prizes/RarityFilter";

interface Props {
  cardDetails: SplCardDetail[];
}

const GOLD_DISTRIBUTION: Record<number, number> = {
  1: 5000, // Common
  2: 2000, // Rare
  3: 1200, // Epic
  4: 400, // Legendary
};

export default function CAGoldRewardsClient({ cardDetails }: Readonly<Props>) {
  const [selectedRarities, setSelectedRarities] = useState<number[]>([]);

  const {
    data: caGoldRewards,
    loading,
    error,
    settledAt,
  } = useAsyncData("jackpot-bucket:ca-gold", fetchCAGoldRewardsCards, {
    errorMessage: "Could not load jackpot gold reward data",
  });

  // Fast card detail lookups
  const cardDetailsMap = useMemo(
    () => new Map(cardDetails.map((card) => [card.id, card])),
    [cardDetails]
  );

  const toggleRarity = useCallback((rarity: number) => {
    setSelectedRarities((prev) =>
      prev.includes(rarity) ? prev.filter((r) => r !== rarity) : [...prev, rarity]
    );
  }, []);

  // Filter rewards by card rarity
  const filteredCards = useMemo(() => {
    if (!caGoldRewards) return [];

    if (selectedRarities.length === 0) {
      return caGoldRewards;
    }

    return caGoldRewards.filter((reward) => {
      const card = cardDetailsMap.get(reward.card_detail_id);

      return card ? selectedRarities.includes(card.rarity) : false;
    });
  }, [caGoldRewards, cardDetailsMap, selectedRarities]);

  // Transform API rewards into bucket entries
  const cards = useMemo<BucketCardEntry[]>(
    () =>
      filteredCards.map((reward) => {
        const cardDetail = cardDetailsMap.get(reward.card_detail_id);
        const count = Number(reward.count);

        return {
          card_detail_id: reward.card_detail_id,
          name: cardDetail?.name ?? "Unknown Card",
          foils: [
            {
              foil: 1, // Gold foil
              count,
              max: GOLD_DISTRIBUTION[reward.rarity] ?? 0,
            },
          ],
          total: count,
        };
      }),
    [filteredCards, cardDetailsMap]
  );

  const hasData = caGoldRewards != null;
  const isInitialLoading = loading && !hasData;
  const hasError = Boolean(error);
  const isEmpty = hasData && caGoldRewards.length === 0;
  const hasNoMatches = hasData && filteredCards.length === 0;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
      {/* Page title */}
      <Stack direction="row" alignItems="center" flexWrap="wrap" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1">
          Jackpot Gold
        </Typography>

        {loading && hasData && <CircularProgress size={18} aria-label="Refreshing data" />}
      </Stack>

      {/* Information */}
      <Alert severity="info" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="body2" component="div">
          <strong>Found in loot chests and rarity draws (reward shop)</strong>

          <Box sx={{ mt: 2 }}>
            <strong>Rarity Draws:</strong>
            <br />
            • Common: 0.5%
            <br />
            • Rare: 0.5%
            <br />
            • Epic: 1%
            <br />• Legendary: 1%
          </Box>

          <Box sx={{ mt: 2 }}>
            <strong>Loot Chests:</strong>
            <br />
            • Minor: 0.25% (chance to be a card: 39.99%)
            <br />
            • Major: 0.75% (chance to be a card: 39.9%)
            <br />• Ultimate: 2% (chance to be a card: 39%)
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }}>
            <em>Note: Alchemy potions will double the gold foil chance.</em>
          </Typography>
        </Typography>
      </Alert>

      {/* Loading state */}
      {isInitialLoading && (
        <Box
          role="status"
          aria-live="polite"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{ py: 8 }}
        >
          <CircularProgress />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Loading jackpot gold rewards...
          </Typography>
        </Box>
      )}

      {/* Error state */}
      {hasError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {typeof error === "string" ? error : "Failed to load jackpot gold rewards."}

          {hasData && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Showing the last available data.
            </Typography>
          )}
        </Alert>
      )}

      {/* Content */}
      {hasData && (
        <>
          {/* Rarity filter */}
          <Box sx={{ mb: 4 }}>
            <RarityFilter selected={selectedRarities} onToggle={toggleRarity} />
          </Box>

          {/* Bucket overview */}
          {cards.length > 0 && <BucketOverview cards={cards} settledAt={settledAt} />}

          {/* Empty states */}
          {hasNoMatches && (
            <Box textAlign="center" sx={{ py: 6 }}>
              <Typography variant="h6" color="text.secondary">
                {isEmpty
                  ? "No jackpot data available"
                  : "No cards match the selected rarity filters"}
              </Typography>

              {!isEmpty && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try selecting different rarities.
                </Typography>
              )}
            </Box>
          )}
        </>
      )}

      <Divider sx={{ my: 4 }} />
    </Container>
  );
}
