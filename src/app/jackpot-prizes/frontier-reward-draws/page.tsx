import ClientCardGrid from "@/components/jackpot-prizes/ClientCardGrid";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { getFrontierDraws } from "@/lib/backend/actions/jackpot-prizes/frontierDraws";
import { Alert, Box } from "@mui/material";
import { Suspense } from "react";

async function FrontierRewardDrawsContent() {
  let frontierDrawsData, cardDetails;
  try {
    [frontierDrawsData, cardDetails] = await Promise.all([getFrontierDraws(), getCardDetails()]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return (
      <Box p={3}>
        <Alert severity="error">Failed to load frontier draws data: {errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <ClientCardGrid
      prizeData={frontierDrawsData}
      cardDetails={cardDetails}
      title="Frontier Reward Draws Prize Overview"
      subtitle="Discover cards available in frontier reward draws"
      showRecentWinnersForEdition={15}
    />
  );
}

export default function FrontierRewardDrawsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FrontierRewardDrawsContent />
    </Suspense>
  );
}
