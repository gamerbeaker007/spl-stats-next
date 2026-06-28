"use client";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { useFortuneWinners } from "@/hooks/fortune-winners/useFortuneWinners";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { Stack } from "@mui/material";
import { FortuneType } from "@prisma/client";
import AccountSelector from "./AccountSelector";
import { WinnerList } from "./WinnerList";

interface Props {
  monitoredAccounts: string[];
  cardDetails: SplCardDetail[];
}

export default function FortuneWinnersClient({ monitoredAccounts, cardDetails }: Props) {
  const { winners, topTenRanked, topTenFrontier, loading, players, setPlayers, search } =
    useFortuneWinners(monitoredAccounts);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          p: 6,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const frontierWinners = winners
    .filter((winner) => winner.type === "FRONTIER")
    .sort((a, b) => {
      const byPlayer = a.player.localeCompare(b.player);
      if (byPlayer !== 0) return byPlayer;

      return b.drawId - a.drawId;
    });
  const rankedWinners = winners
    .filter((winner) => winner.type === "RANKED")
    .sort((a, b) => {
      const byPlayer = a.player.localeCompare(b.player);
      if (byPlayer !== 0) return byPlayer;

      return b.drawId - a.drawId;
    });

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        Fortune Winners
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Top Ten Ranked Winners
          </Typography>
          {topTenRanked.length === 0 ? (
            <Alert severity="info">No ranked winners found.</Alert>
          ) : (
            <Box>
              {topTenRanked.map((winner, index) => (
                <Typography key={winner.player}>
                  {index + 1}: {winner.player} - {winner.count} - {winner.entries} entries
                </Typography>
              ))}
            </Box>
          )}
        </Box>
        <Box>
          <Typography variant="h6" gutterBottom>
            Top Ten Frontier Winners
          </Typography>
          {topTenFrontier.length === 0 ? (
            <Alert severity="info">No frontier winners found.</Alert>
          ) : (
            <Box>
              {topTenFrontier.map((winner, index) => (
                <Typography key={winner.player}>
                  {index + 1}: {winner.player} - {winner.count} - {winner.entries} entries
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      </Stack>
      <AccountSelector accounts={players} setAccounts={setPlayers} search={search} />
      <WinnerList winners={rankedWinners} cardDetails={cardDetails} type={FortuneType.RANKED} />
      <WinnerList winners={frontierWinners} cardDetails={cardDetails} type={FortuneType.FRONTIER} />
    </Box>
  );
}
