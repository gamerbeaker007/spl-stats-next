import LandPageClient from "@/components/collection/land/LandPageClient";
import { Box, Container, Typography } from "@mui/material";

export default function CollectionLandPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Land
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse land plots, deeds, and land resources, inspect live marketplace pricing, and buy,
          transfer, or list them for the selected account.
        </Typography>
        <LandPageClient />
      </Box>
    </Container>
  );
}
