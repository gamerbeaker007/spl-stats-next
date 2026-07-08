import BuyMissingCcPageClient from "@/components/collection/buy-missing-cc/BuyMissingCcPageClient";
import { BuyMissingCcFilterProvider } from "@/lib/frontend/context/BuyMissingCcFilterContext";
import { Box, Container } from "@mui/material";

export default function BuyMissingCcPage() {
  return (
    <Container maxWidth={false} sx={{ px: 2 }}>
      <Box sx={{ pb: 3 }}>
        <BuyMissingCcFilterProvider>
          <BuyMissingCcPageClient />
        </BuyMissingCcFilterProvider>
      </Box>
    </Container>
  );
}
