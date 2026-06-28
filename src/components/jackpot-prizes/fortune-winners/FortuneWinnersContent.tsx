"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import { useFortuneWinners } from "@/hooks/fortune-winners/useFortuneWinners";

interface Props {
  monitoredAccounts: string[];
}

export default function FortuneWinnersContent({ monitoredAccounts }: Props) {
  const { winners, loading, error, players, setPlayers, refetch } =
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

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box p={2}>
      <Typography variant="h4" gutterBottom>
        Fortune Winners
      </Typography>

      {/* TODO AccountChipSelector */}

      {/* TODO Search button */}

      {/* TODO Frontier section */}

      {/* TODO Ranked section */}
    </Box>
  );
}
