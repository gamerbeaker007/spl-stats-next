"use client";

import RarityFilter from "@/components/jackpot-prizes/RarityFilter";
import { SplCardDetail } from "@/types/jackpot-prizes/shared";
import { Alert, Box, Container, Divider, Typography } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { SplCAGoldReward } from "../../../types/jackpot-prizes/cardCollection";
import { CAGoldRewardCardDetail } from "./CAGoldRerwardCardDetail";

interface Props {
  caGoldRewards: SplCAGoldReward[];
  cardDetails: SplCardDetail[];
}

export default function CAGoldRewardsClient({ caGoldRewards, cardDetails }: Props) {
  const [selectedRarities, setSelectedRarities] = useState<number[]>([]);

  const toggleRarity = useCallback((rarity: number) => {
    setSelectedRarities((prev) =>
      prev.includes(rarity) ? prev.filter((r) => r !== rarity) : [...prev, rarity]
    );
  }, []);

  const filteredCards = useMemo(() => {
    if (selectedRarities.length === 0) return caGoldRewards;
    return caGoldRewards.filter((rewardCard) => {
      const card = cardDetails.find((c) => c.id === rewardCard.card_detail_id);
      return card && selectedRarities.includes(card.rarity);
    });
  }, [caGoldRewards, cardDetails, selectedRarities]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
      {/* Page Title */}
      <Typography variant="h4" component="h1" gutterBottom>
        Jackpot Gold
      </Typography>

      <Alert severity="info" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="body2" component="div">
          <strong>Found in loot chest and rarity draws (reward shop)</strong>
          <br />
          <br />
          <strong>Rarity Draws:</strong>
          <br />
          • Common: 0.5%
          <br />
          • Rare: 0.5%
          <br />
          • Epic: 1%
          <br />
          • Legendary: 1%
          <br />
          <br />
          <strong>Loot Chest:</strong>
          <br />
          • Minor: 0.25% (chance to be a card: 39.99%)
          <br />
          • Major: 0.75% (chance to be a card: 39.9%)
          <br />
          • Ultimate: 2% (chance to be a card: 39%)
          <br />
          <br />
          <em>Note: Alchemy potions will double the gold foil chance</em>
        </Typography>
      </Alert>

      {/* Rarity Filter */}
      <Box sx={{ mb: 4 }}>
        <RarityFilter selected={selectedRarities} onToggle={toggleRarity} />
      </Box>

      {/* Cards Grid */}
      {cardDetails && filteredCards && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 3,
            mb: 6,
          }}
        >
          {filteredCards.map((item) => {
            return (
              <CAGoldRewardCardDetail
                key={item.card_detail_id}
                item={item}
                cardDetails={cardDetails}
              />
            );
          })}
        </Box>
      )}
      {filteredCards.length === 0 && (
        <Box textAlign="center" mb={6}>
          <Typography variant="h6" color="text.secondary">
            {selectedRarities.length === 0
              ? "No jackpot data available"
              : "No cards match the selected rarity filters"}
          </Typography>
        </Box>
      )}

      {/* Divider */}
      <Divider sx={{ my: 4 }} />
    </Container>
  );
}
