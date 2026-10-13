import LandMarketPageClient from "@/components/collection/land-market/LandMarketPageClient";
import PageErrorBoundary from "@/components/shared/error-boundaries/PageErrorBoundary";
import { Box, Container, Typography } from "@mui/material";

export default function CollectionLandMarketPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Land Market
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse every land plot listed on the marketplace, filter by location, rarity, terrain,
          resources and more, and buy plots through the purchase cart.
        </Typography>
        <PageErrorBoundary>
          <LandMarketPageClient />
        </PageErrorBoundary>
      </Box>
    </Container>
  );
}
