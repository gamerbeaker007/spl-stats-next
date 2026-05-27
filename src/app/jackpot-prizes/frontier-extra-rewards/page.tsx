import { BucketServer } from "@/components/jackpot-prizes/BucketServer";
import { EditionTierCardsServer } from "@/components/jackpot-prizes/EditionTierCardsServer";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { Box, Container, Divider } from "@mui/material";
import { Suspense } from "react";

export default function FrontierExtraRewardsPage() {
  return (
    <Box>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Suspense fallback={<LoadingSkeleton />}>
          <BucketServer username="$FRONTIER_JACKPOT" />
        </Suspense>
      </Container>
      <Divider />
      <Suspense fallback={<LoadingSkeleton />}>
        <EditionTierCardsServer
          edition={17}
          tier={15}
          title="Frontier Extra Cards"
          subtitle="Extra cards from the frontier era"
          recentWinnersLabel="Recent Winners \u2013 Frontier Extra (last 8 days)"
        />
      </Suspense>
    </Box>
  );
}
