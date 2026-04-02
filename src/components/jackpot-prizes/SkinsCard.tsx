import { getSkinImageUrl } from "@/lib/utils/imageUtils";
import { SplCardDetail } from "@/types/jackpot-prizes/shared";
import { SplSkin } from "@/types/spl/jackpot";
import { Avatar, Box, Card, CardContent, Tooltip, Typography } from "@mui/material";
import Image from "next/image";

export function SkinsCard({ item, cardDetails }: { item: SplSkin; cardDetails: SplCardDetail[] }) {
  const cardDetailId = item.card_detail_id;

  const cardDetail = cardDetails.find((detail) => detail.id === cardDetailId);
  const cardName = cardDetail?.name || "";

  if (!cardDetail || !cardName.trim()) {
    console.warn(`Card detail not found for skin ID: ${cardDetailId}`);
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

  const cleanCardName = cardName.trim();
  const imageUrl = getSkinImageUrl(cleanCardName, item.skin);

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
        <Tooltip
          title={
            <Box sx={{ p: 1 }}>
              <Image src={imageUrl} alt={item.skin} width={260} height={360} />
            </Box>
          }
          placement="top"
        >
          <Avatar
            src={imageUrl}
            alt={item.skin}
            sx={{
              width: 64,
              height: 64,
              mb: 2,
              backgroundColor: "transparent",
              border: "2px solid",
              borderColor: "divider",
              cursor: "pointer",
            }}
          />
        </Tooltip>

        <Typography variant="h6" fontWeight="bold" gutterBottom textAlign="center">
          {`${item.skin} - ${cleanCardName}`}
        </Typography>

        <Box sx={{ mt: "auto", pt: 2 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            color={item.qty > 0 ? "success.main" : "text.secondary"}
            textAlign="center"
          >
            {item.qty.toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
