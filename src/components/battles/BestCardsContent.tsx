"use client";

import { useBattleFilter } from "@/lib/frontend/context/BattleFilterContext";
import { useBattleOverview } from "@/hooks/battles/useBattleOverview";
import CardStatsCard from "./CardStatsCard";
import BestCardsTable from "./BestCardsTable";
import BattleFilterDrawer, { DRAWER_WIDTH } from "./BattleFilterDrawer";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { MdFilterList } from "react-icons/md";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function BestCardsContent() {
  const { filter, toggleFilterOpen } = useBattleFilter();
  const { cards, loading, error } = useBattleOverview(filter);
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width:900px)");

  const topCards = cards.slice(0, filter.topCount);

  const handleCardClick = (cardDetailId: number) => {
    router.push(`/battles/card/${cardDetailId}`);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      {/* Main content — shifts right margin when drawer is open on desktop */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          mr: isDesktop && filter.filterOpen ? `${DRAWER_WIDTH}px` : 0,
          transition: "margin 0.2s",
          minWidth: 0,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Battle Statistics
        </Typography>
        {(!filter.filterOpen || !isDesktop) && (
          <IconButton size="small" onClick={toggleFilterOpen} title="Open filter">
            <MdFilterList size={20} /> Filter
          </IconButton>
        )}

        {!filter.account && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Select an account in the filter panel to see your battle statistics.
          </Alert>
        )}

        {filter.account && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && filter.account && cards.length === 0 && !error && (
          <Alert severity="info">
            No battle data found. Try adjusting the filters or import battle history in the Admin
            panel.
          </Alert>
        )}

        {!loading && cards.length > 0 && (
          <>
            {/* Top X cards grid */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Top {filter.topCount} Cards
            </Typography>
            <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 2, mb: 4 }}>
              {topCards.map((card) => (
                <CardStatsCard
                  key={`${card.cardDetailId}|${card.edition}`}
                  card={card}
                  showWinRate
                  onClick={() => handleCardClick(card.cardDetailId)}
                />
              ))}
            </Stack>

            {/* Full table */}
            <BestCardsTable cards={cards} onCardClick={handleCardClick} />
          </>
        )}
      </Box>

      <BattleFilterDrawer />
    </Box>
  );
}
