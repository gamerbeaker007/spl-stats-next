import { getCardImageV2 } from "@/lib/shared/card-image-utils";
import { getFoilLabel } from "@/lib/shared/card-utils";
import type { BucketCardEntry } from "@/types/jackpot-prizes/bucket";
import { Box, Stack, Typography } from "@mui/material";
import Image from "next/image";
import { DataFreshness } from "./DataFreshness";

const FOIL_SHORT: Record<number, string> = {
  0: "Reg",
  1: "GF",
  2: "GFA",
  3: "BF",
  4: "BFA",
};

const FOIL_COLOR: Record<number, string> = {
  0: "text.secondary",
  1: "warning.main",
  2: "warning.light",
  3: "text.primary",
  4: "secondary.main",
};

interface CardTileProps {
  entry: BucketCardEntry;
}

function CardTile({ entry }: CardTileProps) {
  // Use the first foil present for the display image
  const displayFoil = entry.foils[0]?.foil ?? 0;
  const imageUrl = getCardImageV2(entry.name, displayFoil);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 100,
        gap: 0.5,
      }}
    >
      <Box sx={{ position: "relative", width: 100, height: 140 }}>
        <Image src={imageUrl} alt={entry.name} fill style={{ objectFit: "contain" }} unoptimized />
      </Box>
      <Typography
        variant="caption"
        fontWeight="bold"
        textAlign="center"
        sx={{ lineHeight: 1.2, fontSize: "0.65rem" }}
      >
        {entry.name}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, width: "100%" }}>
        {entry.foils.map(({ foil, count }) => (
          <Box
            key={foil}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              px: 0.5,
              borderRadius: 0.5,
              bgcolor: "action.hover",
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontSize: "0.6rem", color: FOIL_COLOR[foil] ?? "text.secondary" }}
              title={getFoilLabel(foil)}
            >
              {FOIL_SHORT[foil] ?? `F${foil}`}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "0.6rem", fontWeight: "bold" }}>
              {count}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

interface Props {
  cards: BucketCardEntry[];
}

export function BucketOverview({ cards, settledAt }: Props & { settledAt: number | null }) {
  if (cards.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No cards currently in this prize bucket.
      </Typography>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Cards Left in Bucket
        </Typography>
        <DataFreshness timestamp={settledAt} source="browser" provider="Splinterlands" />
      </Stack>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        {cards.map((entry) => (
          <CardTile key={entry.card_detail_id} entry={entry} />
        ))}
      </Box>
    </Box>
  );
}
