import TotemsPageClient from "@/components/collection/totems/TotemsPageClient";
import { Box, Container } from "@mui/material";

export default function CollectionTotemsPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <TotemsPageClient />
      </Box>
    </Container>
  );
}
