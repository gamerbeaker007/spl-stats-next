import SupportFeature from "@/components/support/SupportFeature";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | SPL Stats",
  description:
    "Vote for the spl-stats.com validator and support SPL Stats with donations to beaker007.",
};

export default function SupportPage() {
  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Support SPL Stats
        </Typography>
        <Typography color="text.secondary">
          Vote for the <strong>spl-stats.com</strong> validator and/or directly to{" "}
          <strong>beaker007</strong>.
        </Typography>
      </Box>
      <SupportFeature />
    </Container>
  );
}
