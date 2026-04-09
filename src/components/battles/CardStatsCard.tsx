"use client";

import type { BestCardStat, LosingCardStat } from "@/types/battles";
import { RARITY_LABELS } from "@/types/battles";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Image from "next/image";

interface CardStatsCardProps {
  card: BestCardStat | LosingCardStat;
  onClick?: () => void;
  showWinRate?: boolean;
}

function isPlayerCard(card: BestCardStat | LosingCardStat): card is BestCardStat {
  return "wins" in card;
}

export default function CardStatsCard({ card, onClick, showWinRate = true }: CardStatsCardProps) {
  const isPlayer = isPlayerCard(card);
  const winPct = isPlayer ? card.winPercentage : null;

  const winPctColor =
    winPct === null ? "default" : winPct >= 60 ? "success" : winPct >= 45 ? "warning" : "error";

  return (
    <Card
      sx={{
        width: 130,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.15s, box-shadow 0.15s",
        "&:hover": onClick ? { transform: "translateY(-2px)", boxShadow: 4 } : {},
      }}
      elevation={2}
    >
      <CardActionArea onClick={onClick} disabled={!onClick} sx={{ flex: 1 }}>
        {/* Card image */}
        <Box
          sx={{
            position: "relative",
            height: 160,
            bgcolor: "action.hover",
            overflow: "hidden",
          }}
        >
          <Image
            src={card.imageUrl}
            alt={card.cardName}
            fill
            style={{ objectFit: "cover", objectPosition: "top" }}
            sizes="130px"
            onError={() => {}} // suppress next/image error on bad URL
          />
        </Box>

        <CardContent sx={{ p: 1, pb: "8px !important" }}>
          <Typography
            variant="caption"
            fontWeight={600}
            sx={{
              display: "block",
              lineHeight: 1.2,
              mb: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={card.cardName}
          >
            {card.cardName}
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            Lv {card.level} · {RARITY_LABELS[card.rarity] ?? `R${card.rarity}`}
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
            {card.battles} {card.battles === 1 ? "battle" : "battles"}
          </Typography>

          {isPlayer && showWinRate && winPct !== null && (
            <Chip
              label={`${winPct}%`}
              color={winPctColor as "success" | "warning" | "error" | "default"}
              size="small"
              sx={{ fontSize: "0.65rem", height: 18 }}
            />
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
