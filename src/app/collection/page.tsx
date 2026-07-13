"use client";

import { COLLECTION_NAV_ITEMS } from "@/components/collection/CollectionSubNav";
import { Box, Card, CardActionArea, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";

const DESCRIPTIONS: Record<string, string> = {
  "/collection/cards": "Browse your full card collection with filters and details.",
  "/collection/buy-missing-cc":
    "Find and buy the cheapest missing cards to complete a bracket or max a card.",
  "/collection/skins": "Browse skin ownership and buy, transfer, or list skins.",
  "/collection/music": "Browse music ownership and buy, transfer, or list tracks.",
};

export default function CollectionHomePage() {
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
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 3,
        }}
      >
        {COLLECTION_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.href}
              variant="outlined"
              sx={{
                borderRadius: 3,
                transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                  borderColor: "primary.main",
                },
              }}
            >
              <CardActionArea
                suppressHydrationWarning
                component={Link}
                href={item.href}
                sx={{ p: 3, height: "100%" }}
              >
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                  <Box
                    sx={{
                      display: "inline-flex",
                      p: 1.5,
                      borderRadius: "50%",
                      color: "primary.main",
                      backgroundColor: "action.hover",
                    }}
                  >
                    <Icon size={32} />
                  </Box>
                  <Typography variant="h6">{item.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {DESCRIPTIONS[item.href] ?? ""}
                  </Typography>
                </Stack>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Container>
  );
}
