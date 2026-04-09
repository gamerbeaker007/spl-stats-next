"use client";

import { JackpotCard } from "@/components/jackpot-prizes/JackpotCard";
import RarityFilter from "@/components/jackpot-prizes/RarityFilter";
import { JackpotCardDetail } from "@/types/jackpot-prizes/card";
import { SplCardDetail } from "@/types/jackpot-prizes/shared";
import { Alert, Box, Divider, Typography } from "@mui/material";
import { useCallback, useState } from "react";

interface Props {
  jackpotCards: JackpotCardDetail[];
  cardDetails: SplCardDetail[];
}

function findRarity(card: JackpotCardDetail, cardDetails: SplCardDetail[]) {
  return cardDetails.find((detail) => detail.id === card.id)?.rarity || 0;
}

export function JackpotCardSectionClient({ jackpotCards, cardDetails }: Props) {
  const [selectedRarities, setSelectedRarities] = useState<number[]>([]);

  const toggleRarity = useCallback((rarity: number) => {
    setSelectedRarities((prev) =>
      prev.includes(rarity) ? prev.filter((r) => r !== rarity) : [...prev, rarity]
    );
  }, []);

  const filteredCards =
    selectedRarities.length === 0
      ? jackpotCards
      : jackpotCards.filter((card) => selectedRarities.includes(findRarity(card, cardDetails)));

  const sortedCards = filteredCards.toSorted((a, b) => {
    if (a.id !== b.id) return a.id - b.id;
    return a.foil - b.foil;
  });

  return (
    <Box>
      <Box display="flex" flexDirection="column">
        <Typography variant="h4" component="h1">
          Jackpot Card Data
        </Typography>
      </Box>
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2" component="div">
          <strong>Found as part of jackpot in reward chest</strong>
          <br />
          • Minor: 0.08%
          <br />
          • Major: 0.8%
          <br />
          • Ultimate: 8%
          <br />
        </Typography>
      </Alert>

      <RarityFilter selected={selectedRarities} onToggle={toggleRarity} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)",
            md: "repeat(5, 1fr)",
            lg: "repeat(5, 1fr)",
          },
          gap: 3,
          mb: 6,
        }}
      >
        {sortedCards.map((item) => (
          <JackpotCard
            key={`jackpot-${item.id}-${item.foil}`}
            item={item}
            cardDetails={cardDetails}
          />
        ))}
      </Box>

      {filteredCards.length === 0 && (
        <Box textAlign="center" mb={6}>
          <Typography variant="h6" color="text.secondary">
            {selectedRarities.length > 0
              ? "No cards match the selected rarities"
              : "No jackpot data available"}
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 4 }} />
    </Box>
  );
}
