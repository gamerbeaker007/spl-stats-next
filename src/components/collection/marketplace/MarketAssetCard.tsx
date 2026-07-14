"use client";

import type { MarketActionMode } from "@/components/collection/marketplace/MarketActionDialogHost";
import {
  formatAssetPriceLabel,
  getSkinListableQuantity,
  isSkinActive,
} from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import { Box, Button, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { FaTag } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import { MdCheckCircle } from "react-icons/md";
import { SiHomeassistantcommunitystore } from "react-icons/si";

interface MarketAssetCardProps {
  item: MarketplaceAssetItem;
  onAction: (mode: MarketActionMode, item: MarketplaceAssetItem) => void;
  /** Render the item description prominently (e.g. Titles, where it is meaningful). */
  showDescription?: boolean;
}

/** One tradeable asset tile (image, ownership, price, buy/transfer/list) — shared by skins, music & shopping pages. */
export default function MarketAssetCard({
  item,
  onAction,
  showDescription = false,
}: Readonly<MarketAssetCardProps>) {
  const activeSkin = isSkinActive(item);
  const listableQty = getSkinListableQuantity(item);
  // TODO fix when item is listed it now removed from owned see way to cover that maybe even combine buy and list into one dialog!
  // I think this special for skins!!

  const listDisabled = false; // item.assetName === "SKINS" ? listableQty < 1 : item.numOwned === 0;
  const listTooltip =
    item.assetName !== "SKINS"
      ? "List"
      : activeSkin && listableQty < 1
        ? "Skin is currently active and cannot be listed."
        : activeSkin
          ? `1 active copy is locked. You can list up to ${listableQty}.`
          : "List";

  const activateDisabled = item.assetName !== "SKINS" || item.numOwned < 1 || activeSkin;

  return (
    <Stack
      spacing={1}
      sx={{
        width: 220,
        p: 1.25,
        borderRadius: 2,
        border: activeSkin ? 2 : 1,
        borderColor: activeSkin ? "success.main" : "divider",
        backgroundColor: "background.paper",
        boxShadow: activeSkin ? "0 0 0 1px rgba(76, 175, 80, 0.15)" : "none",
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

      {showDescription && item.description && (
        <Typography
          variant="caption"
          color="text.secondary"
          title={item.description}
          sx={{
            // Clamp to a few lines so long descriptions don't distort the grid.
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.description}
        </Typography>
      )}

      <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap" useFlexGap>
        {activeSkin && <Chip label="Active" color="success" size="small" />}
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
        <Tooltip title={listTooltip}>
          <Box sx={{ width: "100%", display: "flex" }}>
            <Button
              variant="outlined"
              size="small"
              title="List"
              color={activeSkin ? "warning" : "primary"}
              disabled={listDisabled}
              onClick={() => onAction("list", item)}
              fullWidth
            >
              <SiHomeassistantcommunitystore
                style={{ width: "1.1rem", height: "1.1rem" }}
                color={activeSkin ? "orange" : "inherit"}
              />
            </Button>
          </Box>
        </Tooltip>
      </Stack>

      {item.assetName === "SKINS" && (
        <Button
          variant="outlined"
          size="small"
          color={activeSkin ? "success" : "primary"}
          title="Activate"
          disabled={activateDisabled}
          onClick={() => onAction("activate", item)}
          fullWidth
        >
          <MdCheckCircle style={{ width: "1.1rem", height: "1.1rem" }} />
        </Button>
      )}
    </Stack>
  );
}
