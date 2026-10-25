import MusicPageClient from "@/components/collection/music/MusicPageClient";
import { Box, Container } from "@mui/material";

export default function CollectionMusicPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <MusicPageClient />
      </Box>
    </Container>
  );
}
