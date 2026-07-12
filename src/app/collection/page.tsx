"use client";

import { Box, Button, Container, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Collection Management
      </Typography>

      <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 6 }}>
        Market features
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" },
          gap: 4,
          mt: 4,
        }}
      >
        <Box
          sx={{
            p: 3,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            textAlign: "center",
            backgroundColor: "background.paper",
          }}
        >
          <Typography variant="h5" gutterBottom>
            Collection
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            View your collection of cards and buy missing cards to complete your collection.
          </Typography>
          <Button
            onClick={() => handleNavigate("/collection/cards")}
            variant="contained"
            size="large"
            fullWidth
          >
            View Collection
          </Button>
        </Box>

        <Box
          sx={{
            p: 3,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            textAlign: "center",
            backgroundColor: "background.paper",
          }}
        >
          <Typography variant="h5" gutterBottom>
            Buy Missing CC
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            View your collection and buy missing cards to complete your collection or a specific
            bracket.
          </Typography>
          <Button
            onClick={() => handleNavigate("/collection/buy-missing-cc")}
            variant="contained"
            size="large"
            fullWidth
          >
            Buy Missing CC
          </Button>
        </Box>

        <Box
          sx={{
            p: 3,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            textAlign: "center",
            backgroundColor: "background.paper",
          }}
        >
          <Typography variant="h5" gutterBottom>
            Skins
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Browse grouped skin ownership, inspect live marketplace pricing, and manage buy,
            transfer, and listing flows.
          </Typography>
          <Button
            onClick={() => handleNavigate("/collection/skins")}
            variant="contained"
            size="large"
            fullWidth
          >
            Open Skin Collection
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
