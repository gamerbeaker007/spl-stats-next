import { BucketClient } from "@/components/jackpot-prizes/BucketClient";
import { EditionTierCardsServer } from "@/components/jackpot-prizes/EditionTierCardsServer";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { Alert, Box, Container, Divider, Typography } from "@mui/material";
import { Suspense } from "react";

async function FrontierBuckets() {
  let cardDetails;
  let errorMessage: string | null = null;
  try {
    cardDetails = await getCardDetails();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  if (!cardDetails) {
    return (
      <Alert severity="error">
        Could not load bucket card details: {errorMessage ?? "Unknown error"}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Frontier Extra Rewards Buckets
      </Typography>
      <BucketClient username="$FRONTIER_JACKPOT" cardDetails={cardDetails} />
      <Divider sx={{ my: 3 }} />
      <Typography variant="h5" gutterBottom>
        Frontier Vanguard Rewards Buckets
      </Typography>
      <BucketClient username="$COMMUNITY_JACKPOT" cardDetails={cardDetails} />
    </Box>
  );
}

export default function FrontierExtraRewardsPage() {
  return (
    <Box>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Suspense fallback={<LoadingSkeleton />}>
          <FrontierBuckets />
        </Suspense>
      </Container>
      <Divider />
      <Suspense fallback={<LoadingSkeleton />}>
        <EditionTierCardsServer
          edition={17}
          tier={15}
          title="Frontier Extra Cards"
          subtitle="Extra cards from the frontier era"
          recentWinnersLabel="Recent Winners Frontier Extra (last 8 days)"
        />
      </Suspense>
    </Box>
  );
}
