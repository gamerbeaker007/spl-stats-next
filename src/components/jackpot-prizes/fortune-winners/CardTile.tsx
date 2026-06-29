import { getCardImageV2, getFoilLabel } from "@/lib/shared/card-image-utils";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { Box, Card, CardContent, Typography } from "@mui/material";
import { FortuneWinner } from "@prisma/client";
import Image from "next/image";

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

export const CardTile = ({
  winner,
  cardDetails,
}: {
  winner: FortuneWinner;
  cardDetails: SplCardDetail[];
}) => {
  const cardName = cardDetails.find((c) => c.id === winner.cardDetailId)?.name ?? "Unknown Card";
  const imageUrl = getCardImageV2(cardName, winner.cardFoil, false);
  const date = winner.endDate ? new Date(winner.endDate).toLocaleDateString() : "Unknown Date";
  return (
    <Card
      key={`${winner.cardUid}`}
      sx={{
        width: "100%",
        border: FOIL_BORDER[winner.cardFoil] ?? "1px solid",
        borderColor: FOIL_BORDER[winner.cardFoil] ? undefined : "divider",
        bgcolor: "background.paper",
        transition: "transform 150ms ease, box-shadow 150ms ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 4 },
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
              alt={cardName || `Card ${winner.cardDetailId}`}
              fill
              sizes="200px"
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
            color: FOIL_COLOR[winner.cardFoil] ?? "text.secondary",
            fontWeight: 700,
            lineHeight: 1.2,
            mb: 0.5,
          }}
        >
          {getFoilLabel(winner.cardFoil) ?? `Foil ${winner.cardFoil}`}
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
          {cardName || `#${winner.cardDetailId}`}
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
          title={winner.player ?? undefined}
        >
          {winner.player || "Unknown Player"}
        </Typography>

        {/* Draw */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={`Draw ${winner.drawId}`}
        >
          Draw {winner.drawId}
        </Typography>

        {/* Entries */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={`Entries: ${winner.entries}`}
        >
          {winner.entries} entries
        </Typography>
        {/* Date */}
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.25 }}>
          {date}
        </Typography>
      </CardContent>
    </Card>
  );
};
