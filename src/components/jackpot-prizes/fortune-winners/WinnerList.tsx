import { SplCardDetail } from "@/types/spl/cardDetails";
import { Box, Stack, Typography } from "@mui/material";
import { FortuneType, FortuneWinner } from "@prisma/client";
import { CardTile } from "./CardTile";

interface Props {
  winners: FortuneWinner[];
  cardDetails: SplCardDetail[];
  type: FortuneType;
}

export const WinnerList = ({ winners, cardDetails, type }: Props) => {
  const fortuneWinners = winners
    .filter((winner) => winner.type === type)
    .sort((a, b) => {
      const byPlayer = a.player.localeCompare(b.player);
      if (byPlayer !== 0) return byPlayer;

      return b.drawId - a.drawId;
    });

  const title = type === "RANKED" ? "Winners List Ranked" : "Winners List Frontier";
  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      {fortuneWinners.length === 0 && (
        <Box>
          <Typography variant="h6" color="text.secondary">
            No {title.toLowerCase()} found for the selected accounts.
          </Typography>
        </Box>
      )}

      {fortuneWinners.length > 0 && (
        <Box>
          <Stack direction="row" spacing={1}>
            {fortuneWinners.map((winner) => (
              <Box key={`${winner.drawId}-${winner.player}-${winner.cardDetailId}`}>
                <CardTile winner={winner} cardDetails={cardDetails} />
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};
