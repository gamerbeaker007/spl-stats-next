import MarketplaceShoppingPage from "@/components/collection/marketplace/MarketplaceShoppingPage";
import { Box, Container } from "@mui/material";

export default function CollectionConsumablesPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
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
