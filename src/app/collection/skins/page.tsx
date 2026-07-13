import SkinsPageClient from "@/components/collection/skins/SkinsPageClient";
import { CardFilterProvider } from "@/lib/frontend/context/CardFilterContext";
import { Box, Container, Typography } from "@mui/material";

export default function CollectionSkinsPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Skin Collection
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse owned skins, compare marketplace availability, and buy, transfer, or list skins for
          the selected account.
        </Typography>
        <CardFilterProvider>
          <SkinsPageClient />
        </CardFilterProvider>
      </Box>
    </Container>
  );
}
