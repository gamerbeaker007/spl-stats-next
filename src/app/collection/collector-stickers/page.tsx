import MarketplaceShoppingPage from "@/components/collection/marketplace/MarketplaceShoppingPage";
import { Box, Container } from "@mui/material";

export default function CollectionCollectorStickersPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <MarketplaceShoppingPage
          assetName="COLLECTOR_STICKERS"
          searchLabel="Search stickers"
          ownedLabel="Owned stickers only"
          emptyLabel="No collector stickers match the selected filters."
          loadingLabel="Loading collector stickers..."
        />
      </Box>
    </Container>
  );
}
