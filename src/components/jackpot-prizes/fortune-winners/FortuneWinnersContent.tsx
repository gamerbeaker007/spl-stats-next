"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { useFortuneWinners } from "@/hooks/fortune-winners/useFortuneWinners";
import AccountSelector from "./AccountSelector";

interface Props {
  monitoredAccounts: string[];
}

export default function FortuneWinnersContent({ monitoredAccounts }: Props) {
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

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        Fortune Winners
      </Typography>

      <Typography variant="h6" gutterBottom>
        Top Ten Ranked Winners
      </Typography>
      {topTenRanked.length === 0 ? (
        <Alert severity="info">No ranked winners found.</Alert>
      ) : (
        <Box>
          {topTenRanked.map((winner) => (
            <Typography key={winner.player}>
              {winner.player} - {winner.count}
            </Typography>
          ))}
        </Box>
      )}

      <Typography variant="h6" gutterBottom mt={4}>
        Top Ten Frontier Winners
      </Typography>
      {topTenFrontier.length === 0 ? (
        <Alert severity="info">No frontier winners found.</Alert>
      ) : (
        <Box>
          {topTenFrontier.map((winner) => (
            <Typography key={winner.player}>
              {winner.player} - {winner.count}
            </Typography>
          ))}
        </Box>
      )}
      <AccountSelector accounts={players} setAccounts={setPlayers} search={search} />

      {/* TODO Search button */}

      {/* TODO Frontier section */}

      {/* TODO Ranked section */}
    </Box>
  );
}
