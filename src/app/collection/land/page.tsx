import LandPageClient from "@/components/collection/land/LandPageClient";
import { Box, Container } from "@mui/material";

export default function CollectionLandPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <LandPageClient />
      </Box>
    </Container>
  );
}
