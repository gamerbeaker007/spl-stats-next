"use client";
import { getCardImg } from "@/lib/collectionUtils";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import { CardFoil, DetailedPlayerCardCollection } from "@/types/card";
import { Box, Typography } from "@mui/material";
import { Card } from "./Card";

interface CardSectionProps {
  username: string;
  playerCards: DetailedPlayerCardCollection;
}

export const CardSection = ({ username, playerCards }: CardSectionProps) => {
  const { filterCard, hideMissingCards, selectedFoilCategories } = useCardFilter();

  return (
    <Box display="flex" flex={1} flexDirection="column">
      <Typography variant="h6" color="text.secondary" gutterBottom>
        CARDS:
      </Typography>
      <Box display={"flex"} flexDirection={"row"} flexWrap={"wrap"}>
        {Object.values(playerCards).map((cardItem, cardIndex) => {
          // When hide missing and the there are no owned cards, skip rendering
          if (hideMissingCards && cardItem.allCards?.length === 0) return null;

          // Apply all filters to determine if this card should be shown at all
          const passesFilter = filterCard(
            cardItem.edition,
            cardItem.rarity,
            cardItem.color,
            cardItem.secondaryColor,
            cardItem.role
          );
          // Skip this card entirely if it doesn't pass filters
          if (!passesFilter) return null;

          // Skip spoulkeep editions or foundation soulbound cards
          if (cardItem.edition === 9 || cardItem.edition === 11 || cardItem.edition === 16)
            return null;

          // Group player cards by edition and foil
          const cardsByEditionAndFoil = cardItem.allCards?.reduce(
            (acc, card) => {
              const key = `${card.edition}-${card.foil}`;
              if (!acc[key]) {
                acc[key] = {
                  edition: card.edition,
                  foil: card.foil,
                  count: 0,
                  highest_level: 0,
                  cards: [],
                };
              }
              acc[key].count += 1;
              acc[key].highest_level = Math.max(acc[key].highest_level, card.level || 0);
              acc[key].cards.push(card);
              return acc;
            },
            {} as Record<
              string,
              {
                edition: number;
                foil: CardFoil;
                count: number;
                highest_level: number;
                cards: typeof cardItem.allCards;
              }
            >
          );

          // Filter groups by foil if a foil filter is active
          const filteredGroups = cardsByEditionAndFoil
            ? selectedFoilCategories.length > 0
              ? Object.values(cardsByEditionAndFoil).filter((g) =>
                  selectedFoilCategories.includes(g.foil)
                )
              : Object.values(cardsByEditionAndFoil)
            : [];

          // Render cards
          if (filteredGroups.length > 0) {
            // Render owned cards grouped by edition and foil
            return filteredGroups.map((cardGroup, groupIndex) => {
              const imageUrl = getCardImg(
                cardItem.name,
                cardGroup.edition,
                cardGroup.foil,
                cardGroup.highest_level
              );

              return (
                <Card
                  key={`${cardItem.cardDetailId}-${cardGroup.edition}-${cardGroup.foil}`}
                  player={username}
                  name={cardItem.name}
                  imageUrl={imageUrl}
                  subTitle={`(Lvl ${cardGroup.highest_level}) - x${cardGroup.count}`}
                  allCards={cardGroup.cards}
                  priority={cardIndex < 6 && groupIndex === 0}
                />
              );
            });
          } else if (!hideMissingCards && selectedFoilCategories.length === 0) {
            // Render missing card placeholder only when foil filter is not active
            return (
              <Card
                key={`${cardItem.cardDetailId}-missing-${cardItem.edition}`}
                player={username}
                name={cardItem.name}
                imageUrl={getCardImg(cardItem.name, cardItem.edition, "regular", 0)}
                subTitle="(Missing)"
                opacity={0.3}
                priority={cardIndex < 6}
              />
            );
          } else {
            return null;
          }
        })}
      </Box>
    </Box>
  );
};
