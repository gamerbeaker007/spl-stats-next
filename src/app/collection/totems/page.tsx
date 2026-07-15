import TotemsPageClient from "@/components/collection/totems/TotemsPageClient";
import { Box, Container, Typography } from "@mui/material";

export default function CollectionTotemsPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Totems
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse complete totems and totem fragments, inspect live marketplace pricing, and buy,
          transfer, or list them for the selected account.
        </Typography>
        <TotemsPageClient />
      </Box>
    </Container>
  );
}
