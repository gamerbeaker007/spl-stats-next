import { Edition17SpecialCardsServer } from "@/components/jackpot-prizes/Edition17SpecialCardsServer";
import { FrontierBucketServer } from "@/components/jackpot-prizes/FrontierBucketServer";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { Box, Container, Divider } from "@mui/material";
import { Suspense } from "react";

export default function FrontierExtraRewardsPage() {
  return (
    <Box>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Suspense fallback={<LoadingSkeleton />}>
          <FrontierBucketServer />
        </Suspense>
      </Container>
      <Divider />
      <Suspense fallback={<LoadingSkeleton />}>
        <Edition17SpecialCardsServer />
      </Suspense>
    </Box>
  );
}
