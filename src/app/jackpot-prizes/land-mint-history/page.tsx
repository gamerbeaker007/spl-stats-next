import ClientCardGrid from "@/components/jackpot-prizes/ClientCardGrid";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { getJackpotOverview } from "@/lib/backend/actions/jackpot-prizes/jackpotOverview";
import { Alert, Box } from "@mui/material";
import { Suspense } from "react";

const edition = 19;

async function LandMintHistoryContent() {
  let jackpotData, cardDetails;
  try {
    [jackpotData, cardDetails] = await Promise.all([getJackpotOverview(edition), getCardDetails()]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return (
      <Box p={3}>
        <Alert severity="error">Failed to load card data: {errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <ClientCardGrid
      prizeData={jackpotData}
      cardDetails={cardDetails}
      title="Land Mint Jackpot Prize Overview"
      subtitle="Discover cards available in Land"
      showRecentWinnersForEdition={edition}
    />
  );
}

export default function LandMintHistoryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LandMintHistoryContent />
    </Suspense>
  );
}
