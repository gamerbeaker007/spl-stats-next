"use client";

import { frontier_icon_url, ranked_icon_url } from "@/lib/staticsIconUrls";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useFortuneWinners } from "@/hooks/fortune-winners/useFortuneWinners";
import { useCardDetails } from "@/hooks/multi-account-dashboard/useCardDetails";
import { FortuneType } from "@prisma/client";
import AccountSelector from "./AccountSelector";
import TopTenPanel from "./TopTenPanel";
import { WinnerList } from "./WinnerList";

export default function FortuneWinnersClient() {
  const { cardDetails } = useCardDetails(); // Client component, so we can use the hook here
  const {
    winners,
    topTenRanked,
    topTenFrontier,
    searching,
    topTenLoading,
    players,
    setPlayers,
    search,
  } = useFortuneWinners();

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Typography variant="h4" gutterBottom>
        Fortune Winners
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 720 }}>
        See who has won cards in the Splinterlands fortune draws. The all-time top ten is shown
        below; add any account to the search list to see their individual wins.
      </Typography>

      {/* All-time top ten — always visible, independent of the account search */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="stretch"
        sx={{ mb: 4 }}
      >
        <TopTenPanel
          title="Top Ten Ranked Winners"
          icon={ranked_icon_url}
          iconAlt="Ranked draw"
          winners={topTenRanked}
          loading={topTenLoading}
        />
        <TopTenPanel
          title="Top Ten Frontier Winners"
          icon={frontier_icon_url}
          iconAlt="Frontier draw"
          winners={topTenFrontier}
          loading={topTenLoading}
        />
      </Stack>

      <Typography variant="h5" gutterBottom>
        Search wins by account
      </Typography>
      <Box sx={{ mb: 2, maxWidth: 560 }}>
        <AccountSelector accounts={players} setAccounts={setPlayers} search={search} />
      </Box>

      {searching ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : players.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
          Add an account above to see the cards they have won in the fortune draws.
        </Typography>
      ) : (
        <>
          <WinnerList winners={winners} cardDetails={cardDetails} type={FortuneType.RANKED} />
          <WinnerList winners={winners} cardDetails={cardDetails} type={FortuneType.FRONTIER} />
        </>
      )}
    </Box>
  );
}
