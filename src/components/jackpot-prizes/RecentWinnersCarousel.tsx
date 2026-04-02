"use client";

import { getCardImageUrl, getFoilLabel } from "@/lib/utils/imageUtils";
import { RecentWinner, SplCardDetail } from "@/types/jackpot-prizes/shared";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { Box, Card, CardContent, IconButton, Typography } from "@mui/material";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const FOIL_COLOR: Record<number, string> = {
  2: "#FFD700",
  3: "#1A1A2E",
  4: "#9C27B0",
};

const FOIL_BORDER: Record<number, string> = {
  2: "2px solid #FFD700",
  3: "2px solid #1A1A2E",
  4: "2px solid #9C27B0",
};

const CARD_WIDTH = 120;
const CARD_GAP = 10;
const VISIBLE_CARDS = 7;
const SCROLL_STEP = CARD_WIDTH + CARD_GAP;

interface Props {
  winners: RecentWinner[];
  cardDetails: SplCardDetail[];
}

export function RecentWinnersCarousel({ winners, cardDetails }: Props) {
  const [offset, setOffset] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_CARDS);
  const dragStartX = useRef<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setVisibleCount(Math.max(1, Math.floor(w / SCROLL_STEP)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxOffset = Math.max(0, winners.length - visibleCount);

  const handlePrev = () => setOffset((o) => Math.max(0, o - 1));
  const handleNext = () => setOffset((o) => Math.min(maxOffset, o + 1));

  const onDragStart = (clientX: number) => {
    dragStartX.current = clientX;
    setIsDragging(true);
    setDragDelta(0);
  };

  const onDragMove = (clientX: number) => {
    if (dragStartX.current === null) return;
    setDragDelta(clientX - dragStartX.current);
  };

  const onDragEnd = () => {
    if (dragStartX.current === null) return;
    const steps = -Math.round(dragDelta / SCROLL_STEP);
    setOffset((o) => Math.max(0, Math.min(maxOffset, o + steps)));
    dragStartX.current = null;
    setIsDragging(false);
    setDragDelta(0);
  };

  if (winners.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        No recent winners found.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", overflow: "hidden" }}>
      <IconButton
        onClick={handlePrev}
        disabled={offset === 0}
        sx={{ flexShrink: 0 }}
        aria-label="Previous winners"
      >
        <ArrowBackIosNewIcon />
      </IconButton>

      {/* Viewport */}
      <Box
        ref={viewportRef}
        sx={{ flex: 1, minWidth: 0, overflow: "hidden", cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={(e) => onDragStart(e.clientX)}
        onMouseMove={(e) => isDragging && onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
        onTouchEnd={onDragEnd}
      >
        {/* Track */}
        <Box
          ref={trackRef}
          sx={{
            display: "flex",
            gap: `${CARD_GAP}px`,
            transform: `translateX(-${offset * SCROLL_STEP - dragDelta}px)`,
            transition: isDragging ? "none" : "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            userSelect: "none",
          }}
        >
          {winners.map((winner, i) => {
            const cardDetail = cardDetails.find((d) => d.id === winner.card_detail_id);
            const cardName = cardDetail?.name?.trim() ?? "";
            const isLandCard = cardDetail?.tier === 19;
            const imageUrl = cardName ? getCardImageUrl(cardName, winner.foil, isLandCard) : "";
            const date = new Date(winner.mint_date ?? "").toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <Card
                key={`${winner.uid}-${i}`}
                sx={{
                  minWidth: CARD_WIDTH,
                  maxWidth: CARD_WIDTH,
                  flexShrink: 0,
                  border: FOIL_BORDER[winner.foil] ?? "1px solid #333",
                  bgcolor: "background.paper",
                }}
              >
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  {/* Card image */}
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "260/360",
                      mb: 1,
                    }}
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={cardName || `Card ${winner.card_detail_id}`}
                        fill
                        sizes={`${CARD_WIDTH}px`}
                        style={{ objectFit: "contain", pointerEvents: "none" }}
                        draggable={false}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          bgcolor: "action.disabledBackground",
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </Box>

                  {/* Foil badge */}
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: FOIL_COLOR[winner.foil] ?? "text.secondary",
                      fontWeight: 700,
                      lineHeight: 1.2,
                      mb: 0.5,
                    }}
                  >
                    {getFoilLabel(winner.foil) ?? `Foil ${winner.foil}`}
                  </Typography>

                  {/* Card name */}
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      fontWeight: 600,
                      lineHeight: 1.3,
                      mb: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={cardName}
                  >
                    {cardName || `#${winner.card_detail_id}`}
                  </Typography>

                  {/* Winner */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={winner.mint_player ?? undefined}
                  >
                    {winner.mint_player}
                  </Typography>

                  {/* Date */}
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ display: "block", mt: 0.25 }}
                  >
                    {date}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Box>

      <IconButton
        onClick={handleNext}
        disabled={offset >= maxOffset}
        sx={{ flexShrink: 0 }}
        aria-label="Next winners"
      >
        <ArrowForwardIosIcon />
      </IconButton>
    </Box>
  );
}
