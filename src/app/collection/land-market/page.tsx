import LandMarketPageClient from "@/components/collection/land-market/LandMarketPageClient";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { Box, Container } from "@mui/material";

export default function CollectionLandMarketPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <PageErrorBoundary>
          <LandMarketPageClient />
        </PageErrorBoundary>
      </Box>
    </Container>
  );
}
