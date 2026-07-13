"use client";

import type { MarketActionMode } from "@/components/collection/marketplace/MarketActionDialogHost";
import { formatAssetPriceLabel } from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { FaTag } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import { SiHomeassistantcommunitystore } from "react-icons/si";

interface MarketAssetCardProps {
  item: MarketplaceAssetItem;
  onAction: (mode: MarketActionMode, item: MarketplaceAssetItem) => void;
}

/** One tradeable asset tile (image, ownership, price, buy/transfer/list) — shared by skins & music. */
export default function MarketAssetCard({ item, onAction }: Readonly<MarketAssetCardProps>) {
  return (
    <Stack
      spacing={1}
      sx={{
        width: 220,
        p: 1.25,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
      }}
    >
      <Typography variant="subtitle2" align="center" noWrap title={item.displayName}>
        {item.displayName}
      </Typography>

      <Box
        component="img"
        src={item.image ?? ""}
        alt={item.displayName}
        sx={{
          width: "100%",
          height: 180,
          objectFit: "contain",
          opacity: item.numOwned > 0 ? 1 : 0.5,
        }}
      />

      {item.setName && (
        <Typography variant="caption" color="text.secondary" align="center" noWrap>
          {item.setName}
        </Typography>
      )}

      <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap" useFlexGap>
        <Chip
          label={item.numOwned > 0 ? `Owned x${item.numOwned}` : "Not owned"}
          color={item.numOwned > 0 ? "success" : "default"}
          size="small"
        />
        <Chip
          label={item.numListed > 0 ? `Listed x${item.numListed}` : "No listings"}
          color={item.numListed > 0 ? "warning" : "default"}
          size="small"
        />
      </Stack>

      <Typography variant="caption" color="text.secondary" align="center">
        {formatAssetPriceLabel(item)}
      </Typography>

      <Stack direction="row" spacing={0.5}>
        <Button
          variant="outlined"
          size="small"
          title="Buy"
          disabled={item.numListed === 0}
          onClick={() => onAction("buy", item)}
          fullWidth
        >
          <FaTag style={{ width: "1.1rem", height: "1.1rem" }} />
        </Button>
        <Button
          variant="outlined"
          size="small"
          title="Transfer"
          disabled={item.numOwned === 0}
          onClick={() => onAction("transfer", item)}
          fullWidth
        >
          <IoMdSend style={{ width: "1.1rem", height: "1.1rem" }} />
        </Button>
        <Button
          variant="outlined"
          size="small"
          title="List"
          disabled={item.numOwned === 0}
          onClick={() => onAction("list", item)}
          fullWidth
        >
          <SiHomeassistantcommunitystore style={{ width: "1.1rem", height: "1.1rem" }} />
        </Button>
      </Stack>
    </Stack>
  );
}
