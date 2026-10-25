import PacksPageClient from "@/components/collection/packs/PacksPageClient";
import { Box, Container } from "@mui/material";

export default function CollectionPacksPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <PacksPageClient />
      </Box>
    </Container>
  );
}
