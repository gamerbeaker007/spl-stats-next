"use client";

import CardHistoryTable from "@/components/shared/CardHistoryTable";
import { useCardHistory } from "@/hooks/useCardHistory";
import { useMintData } from "@/hooks/jackpot-prizes/useMintData";
import { usePeakMonsterPrices } from "@/hooks/jackpot-prizes/usePeakMonsterPrices";
import { getFoilLabel } from "@/lib/shared/card-utils";
import { CardPrizeData, MintHistoryItem } from "@/types/jackpot-prizes/shared";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { ArrowBack, Close, Info } from "@mui/icons-material";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  SwipeableDrawer,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Image from "next/image";
import { useEffect, useState } from "react";

export interface PaneSelection {
  card: SplCardDetail;
  prizeData: CardPrizeData;
  foil: number;
}

interface Props {
  selection: PaneSelection | null;
  onClose: () => void;
}

type PaneView = "mints" | "history";

export default function DetailPane({ selection, onClose }: Props) {
  const { card, foil } = selection ?? {};
  const { getMintData, fetchMintData } = useMintData();
  const {
    cardHistory,
    loading: historyLoading,
    error: historyError,
    fetchCardHistory,
  } = useCardHistory();
  const { getPriceForCard, getTopBidForCard, loading: priceLoading } = usePeakMonsterPrices();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [view, setView] = useState<PaneView>("mints");
  const [historyPlayer, setHistoryPlayer] = useState<string | null>(null);
  const [prevCardId, setPrevCardId] = useState<number | undefined>(card?.id);
  const [prevFoil, setPrevFoil] = useState<number | undefined>(foil);

  // Reset to mints view whenever the selection changes (card or foil)
  if (card?.id !== prevCardId || foil !== prevFoil) {
    setPrevCardId(card?.id);
    setPrevFoil(foil);
    setView("mints");
    setHistoryPlayer(null);
  }

  // Fetch mint list when selection changes
  useEffect(() => {
    if (card && foil !== undefined && !getMintData(card.id, foil)) {
      fetchMintData(card.id, foil);
    }
  }, [card, foil, fetchMintData, getMintData]);

  const mintInfo = card && foil !== undefined ? getMintData(card.id, foil) : null;
  const isLoadingMints = !mintInfo;

  const cardPrice = card && foil !== undefined ? getPriceForCard(card.id, foil) : null;
  const topBid = card && foil !== undefined ? getTopBidForCard(card.id, foil) : null;

  const priceSection = (
    <Box
      sx={{
        mx: 2,
        mt: 1.5,
        mb: 0.5,
        p: 1.5,
        borderRadius: 1,
        bgcolor: "action.hover",
        border: 1,
        borderColor: "divider",
      }}
    >
      {/* PeakMonsters attribution */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
        <Tooltip title="Data from PeakMonsters" placement="top">
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Image
              src="https://peakmonsters.com/app/img/logo_light_large.de4cbfe1.png"
              alt="PeakMonsters"
              width={80}
              height={16}
              style={{ objectFit: "contain" }}
              unoptimized
            />
            <Typography variant="caption" color="text.secondary">
              Market Prices
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {priceLoading ? (
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress size={12} />
          <Typography variant="caption" color="text.secondary">
            Loading prices…
          </Typography>
        </Box>
      ) : cardPrice ? (
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Last Sale (Total)
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              ${cardPrice.last_sell_price.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Last Sale (BCX)
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              ${cardPrice.last_bcx_price.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Prev Sale (BCX)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ${cardPrice.prev_bcx_price.toLocaleString()}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          No price data available
        </Typography>
      )}

      {/* Top Bid */}
      {!priceLoading && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Top Bid
          </Typography>
          {topBid ? (
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Price (BCX)
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="info.main">
                  ${topBid.usd_price.toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Qty
                </Typography>
                <Typography variant="body2" color="text.primary">
                  {topBid.remaining_qty.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              No bids
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );

  const handleHistoryClick = (mint: MintHistoryItem) => {
    if (!mint.uid || !mint.mint_player) return;
    setHistoryPlayer(mint.mint_player);
    setView("history");
    fetchCardHistory(mint.uid);
  };

  const header = !selection ? null : (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        px: 2,
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
        gap: 1,
        flexShrink: 0,
      }}
    >
      {view === "history" && (
        <IconButton size="small" onClick={() => setView("mints")}>
          <ArrowBack fontSize="small" />
        </IconButton>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight="bold" noWrap>
          {card!.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {view === "mints"
            ? `${getFoilLabel(foil!)} — Mint List`
            : `Card History — ${historyPlayer}`}
        </Typography>
      </Box>
      {isMobile && (
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <SwipeableDrawer
        anchor="bottom"
        open={!!selection}
        onOpen={() => {}}
        onClose={onClose}
        disableSwipeToOpen
        PaperProps={{
          sx: {
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Drag handle */}
        <Box sx={{ pt: 1, pb: 0.5, display: "flex", justifyContent: "center", flexShrink: 0 }}>
          <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: "divider" }} />
        </Box>
        {header}
        {selection && view === "mints" && priceSection}

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
          {view === "mints" && (
            <>
              {isLoadingMints ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  {mintInfo?.mints.map((mint: MintHistoryItem, idx: number) => (
                    <Box
                      key={mint.uid}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 0.75,
                        px: 1,
                        borderRadius: 1,
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <Box>
                        <Typography
                          variant="body2"
                          component="span"
                          sx={{ fontFamily: "monospace", color: "text.secondary", mr: 1 }}
                        >
                          #{mint.mint ? mint.mint.split("/")[0] : idx + 1}
                        </Typography>
                        <Typography variant="body2" component="span">
                          {mint.mint_player || "—"}
                        </Typography>
                      </Box>
                      {mint.mint_player && (
                        <Chip
                          label="History"
                          size="small"
                          variant="outlined"
                          onClick={() => handleHistoryClick(mint)}
                          sx={{ fontSize: "0.65rem", height: 20, cursor: "pointer" }}
                        />
                      )}
                    </Box>
                  ))}
                  {mintInfo && mintInfo.mints.length === 0 && (
                    <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
                      No mints found
                    </Typography>
                  )}
                </Box>
              )}
            </>
          )}

          {view === "history" && (
            <>
              <CardHistoryTable
                cardHistory={cardHistory}
                loading={historyLoading}
                error={historyError}
                dense
              />
            </>
          )}
        </Box>
      </SwipeableDrawer>
    );
  }

  // Desktop: sticky side panel
  return (
    <Paper
      elevation={4}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 2,
      }}
    >
      {!selection ? (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          height="100%"
          px={3}
          gap={1}
        >
          <Info sx={{ fontSize: 48, color: "text.disabled" }} />
          <Typography variant="body1" color="text.secondary" textAlign="center">
            Select a card foil to view mint details
          </Typography>
        </Box>
      ) : (
        <>
          {header}
          {view === "mints" && priceSection}
          {/* Content (reused) */}
          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {view === "mints" && (
              <>
                {isLoadingMints ? (
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box>
                    {mintInfo?.mints.map((mint: MintHistoryItem, idx: number) => (
                      <Box
                        key={mint.uid}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          py: 0.75,
                          px: 1,
                          borderRadius: 1,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Box>
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{ fontFamily: "monospace", color: "text.secondary", mr: 1 }}
                          >
                            #{mint.mint ? mint.mint.split("/")[0] : idx + 1}
                          </Typography>
                          <Typography variant="body2" component="span">
                            {mint.mint_player || "—"}
                          </Typography>
                        </Box>
                        {mint.mint_player && (
                          <Chip
                            label="History"
                            size="small"
                            variant="outlined"
                            onClick={() => handleHistoryClick(mint)}
                            sx={{ fontSize: "0.65rem", height: 20, cursor: "pointer" }}
                          />
                        )}
                      </Box>
                    ))}
                    {mintInfo && mintInfo.mints.length === 0 && (
                      <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
                        No mints found
                      </Typography>
                    )}
                  </Box>
                )}
              </>
            )}
            {view === "history" && (
              <>
                <CardHistoryTable
                  cardHistory={cardHistory}
                  loading={historyLoading}
                  error={historyError}
                  dense
                />
              </>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}
