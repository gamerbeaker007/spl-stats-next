import MarketplaceShoppingPage from "@/components/collection/marketplace/MarketplaceShoppingPage";
import { Box, Container, Typography } from "@mui/material";

export default function CollectionCollectorStickersPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Collector Stickers
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse collector stickers, inspect live marketplace pricing, and buy, transfer, or list
          them for the selected account.
        </Typography>
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
