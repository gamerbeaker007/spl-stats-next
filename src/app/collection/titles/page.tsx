import MarketplaceShoppingPage from "@/components/collection/marketplace/MarketplaceShoppingPage";
import { Box, Container } from "@mui/material";

export default function CollectionTitlesPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
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
