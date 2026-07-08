"use client";
import BuyCardDialog from "@/components/collection/buy-card-dialog/BuyCardDialog";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { matchesCardFilter } from "@/lib/shared/card-filter-utils";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import {
  CardFoil,
  type DetailedPlayerCardCollection,
  DetailedPlayerCardCollectionItem,
} from "@/types/card";
import { Alert, Box, Snackbar, Typography } from "@mui/material";
import { useState } from "react";
import { Card } from "./Card";

interface CardSectionProps {
  username: string;
  playerCards: DetailedPlayerCardCollection;
  selectableAccounts?: string[];
}

type DialogCard = DetailedPlayerCardCollectionItem & {
  foil: CardFoil;
  currentCc: number;
};

export const CardSection = ({ username, playerCards, selectableAccounts }: CardSectionProps) => {
  const { filter } = useCardFilter();
  const { addItems } = usePurchasePlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [dialogCard, setDialogCard] = useState<DialogCard | null>(null);

  const openBuyDialog = (card: DialogCard) => {
    setDialogCard(card);
    setDialogOpen(true);
  };

  return (
    <Box display="flex" flex={1} flexDirection="column">
      <Typography variant="h6" color="text.secondary" gutterBottom>
        CARDS:
      </Typography>
      <Box display={"flex"} flexDirection={"row"} flexWrap={"wrap"}>
        {Object.values(playerCards).map((cardItem, cardIndex) => {
          // When hide missing and the there are no owned cards, skip rendering
          if (filter.hideMissingCards && cardItem.allCards?.length === 0) return null;

          // Apply all filters to determine if this card should be shown at all
          const passesFilter = matchesCardFilter(cardItem, filter);
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

          const foilFilterActive = filter.foilCategories.length > 0;

          // Filter groups by foil if a foil filter is active
          const filteredGroups = cardsByEditionAndFoil
            ? foilFilterActive
              ? Object.values(cardsByEditionAndFoil).filter((g) =>
                  filter.foilCategories.includes(g.foil)
                )
              : Object.values(cardsByEditionAndFoil)
            : [];

          // Render cards
          if (filteredGroups.length > 0) {
            // Render owned cards grouped by edition and foil
            return filteredGroups.map((cardGroup, groupIndex) => {
              const imageUrl = getCardImageByLevel(
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
                  onClick={() =>
                    openBuyDialog({
                      ...cardItem,
                      foil: cardGroup.foil,
                      currentCc: cardGroup.count,
                    })
                  }
                />
              );
            });
          }

          // No owned cards match the current foil selection — decide whether to
          // show a "missing" placeholder.
          if (filter.hideMissingCards) return null;

          // With a foil filter active, only show "missing" when this card was
          // actually printed in at least one of the selected foils for this
          // edition (e.g. don't mark an Alpha card as a missing "black" foil —
          // it never existed).
          if (
            foilFilterActive &&
            !filter.foilCategories.some((f) => cardItem.availableFoils.includes(f))
          ) {
            return null;
          }

          //when card is not in collection return missing with regular foil
          const foil = "regular";
          return (
            <Card
              key={`${cardItem.cardDetailId}-missing-${cardItem.edition}`}
              player={username}
              name={cardItem.name}
              imageUrl={getCardImageByLevel(cardItem.name, cardItem.edition, foil)}
              subTitle="(Missing)"
              opacity={0.3}
              priority={cardIndex < 6}
              onClick={() =>
                openBuyDialog({
                  ...cardItem,
                  foil,
                  currentCc:
                    cardItem.allCards?.filter(
                      (card) => card.owner.toLowerCase() === username.toLowerCase()
                    ).length ?? 0,
                })
              }
            />
          );
        })}
      </Box>

      {dialogCard && (
        <BuyCardDialog
          open={dialogOpen}
          mode="manual-listings"
          account={username}
          card={dialogCard}
          initialFoilSelection={dialogCard.foil}
          currentCc={dialogCard.currentCc}
          selectableAccounts={selectableAccounts ?? [username]}
          onClose={() => setDialogOpen(false)}
          onAddToPurchasePlan={(items) => {
            addItems(items);
            setFeedback(`Added ${items.length} listing(s) to cart.`);
          }}
        />
      )}

      {feedbackError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setFeedbackError(null)}>
          {feedbackError}
        </Alert>
      )}

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={3000}
        onClose={() => setFeedback(null)}
        message={feedback}
      />
    </Box>
  );
};
