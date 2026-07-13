import MusicPageClient from "@/components/collection/music/MusicPageClient";
import { Box, Container, Typography } from "@mui/material";

export default function CollectionMusicPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Music Collection
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse owned music, inspect live marketplace pricing, and buy, transfer, or list music for
          the selected account.
        </Typography>
        <MusicPageClient />
      </Box>
    </Container>
  );
}
