import ClientCardGrid from "@/components/jackpot-prizes/ClientCardGrid";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { getJackpotOverview } from "@/lib/backend/actions/jackpot-prizes/jackpotOverview";
import { Alert, Box } from "@mui/material";
import { Suspense } from "react";

async function EscalationMintHistoryContent() {
  let jackpotData, cardDetails;
  try {
    [jackpotData, cardDetails] = await Promise.all([getJackpotOverview(20), getCardDetails()]);
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
      title="Escalation Jackpot Prize Overview"
      subtitle="Discover cards available in Escalation packs"
      showRecentWinnersForEdition={20}
    />
  );
}

export default function EscalationMintHistoryPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <EscalationMintHistoryContent />
    </Suspense>
  );
}
