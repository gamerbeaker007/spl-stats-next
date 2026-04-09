import { getCardImageUrl, getFallbackImageUrl } from "@/lib/shared/card-image-utils";
import { SplCardDetail } from "@/types/jackpot-prizes/shared";
import { Box, Card, CardContent, Typography } from "@mui/material";
import Image from "next/image";
import { SplCAGoldReward } from "../../../types/jackpot-prizes/cardCollection";

const distrubution = [
  5000, // Common
  2000, // rare
  1200, // epic
  400, // legendary
];

export function CAGoldRewardCardDetail({
  item,
  cardDetails,
}: {
  item: SplCAGoldReward;
  cardDetails: SplCardDetail[];
}) {
  const cardDetailId = item.card_detail_id;

  const cardDetail = cardDetails.find((detail) => detail.id === cardDetailId);

  const cardName = cardDetail?.name || "";

  // Early return if card detail is not found
  if (!cardDetail || !cardName.trim()) {
    console.warn(`Card detail not found for ID: ${cardDetailId}`);
    return (
      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <CardContent
          sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", p: 3 }}
        >
          <Typography variant="h6" color="error" textAlign="center">
            Card data not found (ID: {cardDetailId})
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Use the utility function for safe image URL generation
  const imageUrl = getCardImageUrl(cardDetail.name, 1); // always 1 gold in this case
  const fallbackUrl = getFallbackImageUrl(cardDetail.name);

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", p: 3 }}
      >
        <Box sx={{ p: 1 }}>
          <Image
            src={imageUrl}
            alt={cardDetail.name}
            width={260}
            height={360}
            onError={(e) => {
              console.warn(`Image failed to load: ${imageUrl}`);
              // Fallback to regular card image if foil image fails
              (e.target as HTMLImageElement).src = fallbackUrl;
            }}
            unoptimized // Disable Next.js optimization for external images
          />
          <Typography variant="h6" fontWeight="bold" gutterBottom textAlign="center">
            {cardDetail.name}
          </Typography>
        </Box>

        <Box sx={{ mt: "auto", pt: 2 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            color={Number(item.count) > 0 ? "success.main" : "text.secondary"}
            textAlign="center"
          >
            {item.count.toLocaleString()} / {distrubution[cardDetail.rarity - 1]}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
