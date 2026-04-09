import { getSkinImageUrl } from "@/lib/shared/card-image-utils";
import { RewardSummary } from "@/types/parsedHistory";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { Box, Typography } from "@mui/material";

interface Props {
  totalSkins: RewardSummary["totalSkins"];
  cardDetails?: SplCardDetail[];
}

export function Skins({ totalSkins, cardDetails }: Props) {
  const entries = Object.entries(totalSkins);
  if (entries.length === 0) return null;

  return (
    <Box border="1px solid" borderRadius={2} p={2}>
      <Typography variant="h6" gutterBottom>
        Skins
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2}>
        {entries.map(([idStr, data]) => {
          const cardName =
            cardDetails?.find((d) => d.id === data.cardDetailId)?.name ??
            `Card #${data.cardDetailId}`;
          const imageUrl = getSkinImageUrl(cardName, data.skin);

          return (
            <Box
              key={idStr}
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={0.5}
              width={90}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={data.skin}
                width={80}
                height={112}
                style={{ objectFit: "cover", borderRadius: 6, display: "block" }}
              />
              <Typography
                variant="caption"
                align="center"
                sx={{ fontSize: 10, lineHeight: 1.2 }}
                noWrap
              >
                {data.skin}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: "text.secondary" }} noWrap>
                {cardName}
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>
                ×{data.quantity}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
