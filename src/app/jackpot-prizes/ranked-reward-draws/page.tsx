import ClientCardGrid from "@/components/jackpot-prizes/ClientCardGrid";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { getRankedDraws } from "@/lib/backend/actions/jackpot-prizes/rankedDraws";
import { Alert, Box } from "@mui/material";
import { Suspense } from "react";

async function RankedRewardDrawsContent() {
  let rankedDrawsData, cardDetails;
  try {
    [rankedDrawsData, cardDetails] = await Promise.all([getRankedDraws(), getCardDetails()]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return (
      <Box p={3}>
        <Alert severity="error">Failed to load ranked draws data: {errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <ClientCardGrid
      prizeData={rankedDrawsData}
      cardDetails={cardDetails}
      title="Ranked Reward Draws Prize Overview"
      subtitle="Discover cards available in ranked reward draws"
      showRecentWinnersForEdition={18}
    />
  );
}

export default function RankedRewardDrawsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <RankedRewardDrawsContent />
    </Suspense>
  );
}
