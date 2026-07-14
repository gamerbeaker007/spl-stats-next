import PacksPageClient from "@/components/collection/packs/PacksPageClient";
import { Box, Container, Typography } from "@mui/material";

export default function CollectionPacksPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Packs
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse card packs by set, inspect live marketplace pricing, and buy, transfer, or list
          packs for the selected account.
        </Typography>
        <PacksPageClient />
      </Box>
    </Container>
  );
}
