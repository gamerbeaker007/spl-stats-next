"use client";

import LandMarketCard from "@/components/collection/land-market/LandMarketCard";
import type { LandCartState } from "@/hooks/land-market/useLandCart";
import type { LandMarketListing } from "@/types/land/landMarket";
import { Box } from "@mui/material";

interface LandMarketGridProps {
  listings: LandMarketListing[];
  getCartState: (listing: LandMarketListing) => LandCartState;
  onToggleCart: (listing: LandMarketListing) => void;
  decPriceUsd: number | null;
  now: number;
}

export default function LandMarketGrid({
  listings,
  getCartState,
  onToggleCart,
  decPriceUsd,
  now,
}: Readonly<LandMarketGridProps>) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 290px), 1fr))",
        gap: 2,
      }}
    >
      {listings.map((listing) => (
        <LandMarketCard
          key={listing.listingItemId}
          listing={listing}
          cartState={getCartState(listing)}
          onToggleCart={() => onToggleCart(listing)}
          decPriceUsd={decPriceUsd}
          now={now}
        />
      ))}
    </Box>
  );
}
