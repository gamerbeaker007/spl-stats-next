"use client";

import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import { Box, Stack, Typography } from "@mui/material";

interface MarketAssetSummaryProps {
  item: MarketplaceAssetItem;
}

/** Shared header for the buy/list/transfer dialogs: image + name + ownership. */
export default function MarketAssetSummary({ item }: Readonly<MarketAssetSummaryProps>) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <Box
        component="img"
        src={item.image ?? ""}
        alt={item.displayName}
        sx={{ width: 160, height: 160, objectFit: "contain", alignSelf: "center" }}
      />

      <Stack spacing={1} flex={1}>
        <Typography variant="h6">{item.displayName}</Typography>
        {item.groupName && item.groupName !== item.displayName && (
          <Typography variant="body2" color="text.secondary">
            {item.groupName}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Owned: {item.numOwned} | Listed: {item.numListed}
        </Typography>
        {item.description && (
          <Typography variant="body2" color="text.secondary">
            {item.description}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
