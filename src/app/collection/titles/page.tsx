import MarketplaceShoppingPage from "@/components/collection/marketplace/MarketplaceShoppingPage";
import { Box, Container, Typography } from "@mui/material";

export default function CollectionTitlesPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Titles
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse player titles with their descriptions, inspect live marketplace pricing, and buy,
          transfer, or list titles for the selected account.
        </Typography>
        <MarketplaceShoppingPage
          assetName="TITLES"
          searchLabel="Search titles"
          ownedLabel="Owned titles only"
          emptyLabel="No titles match the selected filters."
          loadingLabel="Loading titles..."
          showDescription
        />
      </Box>
    </Container>
  );
}
