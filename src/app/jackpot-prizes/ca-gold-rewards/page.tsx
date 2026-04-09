import CAGoldRewardsClient from "@/components/jackpot-prizes/ca-gold-rewards/CAGoldRewardsClient";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { getJackpotGoldCards } from "@/lib/backend/actions/jackpot-prizes/caGoldRewards";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { Alert, Box } from "@mui/material";
import { Suspense } from "react";

async function CAGoldRewardsContent() {
  let caGoldRewards, cardDetails;
  try {
    [caGoldRewards, cardDetails] = await Promise.all([getJackpotGoldCards(), getCardDetails()]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return (
      <Box p={3}>
        <Alert severity="error">Failed to load CA Gold rewards data: {errorMessage}</Alert>
      </Box>
    );
  }

  return <CAGoldRewardsClient caGoldRewards={caGoldRewards} cardDetails={cardDetails} />;
}

export default function CAGoldRewardsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CAGoldRewardsContent />
    </Suspense>
  );
}
