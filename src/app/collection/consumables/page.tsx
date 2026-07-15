import MarketplaceShoppingPage from "@/components/collection/marketplace/MarketplaceShoppingPage";
import { Box, Container, Typography } from "@mui/material";

export default function CollectionConsumablesPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Consumables
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse potions, tickets, and other consumables, inspect live marketplace pricing, and buy,
          transfer, or list them for the selected account.
        </Typography>
        <MarketplaceShoppingPage
          assetName="CONSUMABLES"
          searchLabel="Search consumables"
          ownedLabel="Owned consumables only"
          emptyLabel="No consumables match the selected filters."
          loadingLabel="Loading consumables..."
        />
      </Box>
    </Container>
  );
}
