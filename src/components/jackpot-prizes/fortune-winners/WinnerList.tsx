import { SplCardDetail } from "@/types/spl/cardDetails";
import { Box, Chip, Stack, Typography } from "@mui/material";
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

  const title = type === FortuneType.RANKED ? "Ranked draw wins" : "Frontier draw wins";

  return (
    <Box mt={4}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <Typography variant="h6">{title}</Typography>
        <Chip label={fortuneWinners.length} size="small" color="primary" variant="outlined" />
      </Stack>

      {fortuneWinners.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No {title.toLowerCase()} found for the selected accounts.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          }}
        >
          {fortuneWinners.map((winner) => (
            <CardTile
              key={`${winner.drawId}-${winner.player}-${winner.cardDetailId}`}
              winner={winner}
              cardDetails={cardDetails}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
