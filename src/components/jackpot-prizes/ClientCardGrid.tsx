"use client";

import { RecentWinnersCarousel } from "@/components/jackpot-prizes/RecentWinnersCarousel";
import { useRecentWinners } from "@/hooks/jackpot-prizes/useRecentWinners";
import { CardPrizeData, SplCardDetail } from "@/types/jackpot-prizes/shared";
import {
  Box,
  Container,
  Divider,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import Card from "./Card";
import DetailPane, { PaneSelection } from "./DetailPane";
import RarityFilter from "./RarityFilter";

interface Props {
  prizeData: CardPrizeData[];
  cardDetails: SplCardDetail[];
  title: string;
  subtitle?: string;
  showRecentWinnersForEdition?: number;
}

export default function ClientCardGrid({
  prizeData,
  cardDetails,
  title,
  subtitle,
  showRecentWinnersForEdition,
}: Props) {
  const [selectedRarities, setSelectedRarities] = useState<number[]>([]);
  const [paneSelection, setPaneSelection] = useState<PaneSelection | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleFoilClick = useCallback((card: SplCardDetail, prize: CardPrizeData, foil: number) => {
    setPaneSelection((prev) =>
      prev?.card.id === card.id && prev?.foil === foil ? null : { card, prizeData: prize, foil }
    );
  }, []);

  const toggleRarity = useCallback((rarity: number) => {
    setSelectedRarities((prev) =>
      prev.includes(rarity) ? prev.filter((r) => r !== rarity) : [...prev, rarity]
    );
  }, []);

  const filteredCards = useMemo(() => {
    if (selectedRarities.length === 0) return prizeData;
    return prizeData.filter((prize) => {
      const card = cardDetails.find((c) => c.id === prize.card_detail_id);
      return card && selectedRarities.includes(card.rarity);
    });
  }, [prizeData, cardDetails, selectedRarities]);

  const totals = useMemo(
    () =>
      prizeData.reduce(
        (acc, card) => {
          acc.total += card.total;
          acc.total_minted += card.total_minted;
          return acc;
        },
        { total: 0, total_minted: 0 }
      ),
    [prizeData]
  );

  const totalsFiltered = useMemo(
    () =>
      filteredCards.reduce(
        (acc, card) => {
          acc.total += card.total;
          acc.total_minted += card.total_minted;
          return acc;
        },
        { total: 0, total_minted: 0 }
      ),
    [filteredCards]
  );

  const winnersLabel = `Recent Winners (last 8 days)`;
  const { winners, loading: winnersLoading } = useRecentWinners(showRecentWinnersForEdition);

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Stack>
          <Typography variant="h4" align="center">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" align="center">
              {subtitle}
            </Typography>
          )}
          <Typography variant="body1" align="center">
            Totals: {totals.total_minted} minted / {totals.total} cards
          </Typography>
        </Stack>
      </Box>

      {/* Recent Winners carousel */}
      {showRecentWinnersForEdition !== undefined && (
        <Box sx={{ mb: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            {winnersLabel}
          </Typography>
          {winnersLoading ? (
            <Box sx={{ display: "flex", gap: "10px", py: 1, overflow: "hidden", maxWidth: "100%" }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  width={120}
                  height={200}
                  sx={{ flexShrink: 0 }}
                />
              ))}
            </Box>
          ) : (
            <RecentWinnersCarousel winners={winners} cardDetails={cardDetails} />
          )}
        </Box>
      )}

      {showRecentWinnersForEdition !== undefined && <Divider sx={{ mb: 4 }} />}

      <Box sx={{ mb: 4, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Stack>
          <RarityFilter selected={selectedRarities} onToggle={toggleRarity} />
          <Typography variant="caption" align="center">
            Filtered: {totalsFiltered.total_minted} minted / {totalsFiltered.total} cards
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(2, 1fr)",
            },
            gap: 3,
          }}
        >
          {filteredCards.map((prize) => {
            const card = cardDetails.find((c) => c.id === prize.card_detail_id);
            const isCardSelected = paneSelection?.card.id === card?.id;
            return card ? (
              <Card
                key={card.id}
                prizeData={prize}
                card={card}
                onFoilClick={(foil) => handleFoilClick(card, prize, foil)}
                selectedFoil={isCardSelected ? paneSelection?.foil : null}
              />
            ) : null;
          })}
        </Box>

        {/* Desktop side pane — hidden on mobile (drawer is used instead) */}
        {!isMobile && (
          <Box
            sx={{
              width: 380,
              flexShrink: 0,
              position: "sticky",
              top: 80,
              height: "calc(100vh - 100px)",
            }}
          >
            <DetailPane selection={paneSelection} onClose={() => setPaneSelection(null)} />
          </Box>
        )}
      </Box>

      {/* Mobile drawer */}
      {isMobile && <DetailPane selection={paneSelection} onClose={() => setPaneSelection(null)} />}
    </Container>
  );
}
