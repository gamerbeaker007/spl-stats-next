import SkinsPageClient from "@/components/collection/skins/SkinsPageClient";
import { CardFilterProvider } from "@/lib/frontend/context/CardFilterContext";
import { Box, Container } from "@mui/material";

export default function CollectionSkinsPage() {
  return (
    <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
      <Box sx={{ pb: 3 }}>
        <CardFilterProvider>
          <SkinsPageClient />
        </CardFilterProvider>
      </Box>
    </Container>
  );
}
