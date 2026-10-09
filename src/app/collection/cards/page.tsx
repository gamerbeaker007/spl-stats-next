"use client";

import PlayerCardsClient from "@/components/collection/cards/PlayerCardsClient";
import { Container } from "@mui/material";

export default function CardsCollectionPage() {
  return (
    <Container maxWidth={false} sx={{ px: 4 }}>
      <PlayerCardsClient />
    </Container>
  );
}
