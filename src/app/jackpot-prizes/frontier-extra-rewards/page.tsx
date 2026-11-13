import { BucketClient } from "@/components/jackpot-prizes/BucketClient";
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
        Foundation - Extra
      </Typography>
      <BucketClient username="$FRONTIER_JACKPOT" cardDetails={cardDetails} />
      <Divider sx={{ my: 3 }} />
      <Typography variant="h5" gutterBottom>
        Foundation - Extra (Vanguard)
      </Typography>
      <BucketClient username="$COMMUNITY_JACKPOT" cardDetails={cardDetails} />
    </Box>
  );
}

export default function FrontierExtraRewardsPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Suspense fallback={<LoadingSkeleton />}>
        <FrontierBuckets />
      </Suspense>
    </Container>
  );
}
