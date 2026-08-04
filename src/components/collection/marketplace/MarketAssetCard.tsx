"use client";

import type { MarketActionMode } from "@/components/collection/marketplace/MarketActionDialogHost";
import {
  formatAssetPriceLabel,
  getActivateTooltip,
  getActualOwnedQuantity,
  getAvailableToListQuantity,
  getCurrentlyListedQuantity,
  getDeedImg,
  getListTooltip,
  isSkinActive,
} from "@/lib/shared/marketplace-assets";
import { largeNumberFormat } from "@/lib/utils";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import InfoIcon from "@mui/icons-material/Info";
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

function getOwnedTooltip(actualOwned: number, currentlyListed: number) {
  if (actualOwned > 0 && currentlyListed > 0) {
    return `Owned x${actualOwned} (Listed x${currentlyListed})`;
  }

  if (actualOwned > 0) {
    return `Owned x${actualOwned}`;
  }

  return "Not owned";
}

/** One tradeable asset tile (image, ownership, price, buy/transfer/list) — shared by skins, music & shopping pages. */
export default function MarketAssetCard({
  item,
  onAction,
  showDescription = false,
}: Readonly<MarketAssetCardProps>) {
  const activeSkin = isSkinActive(item);
  const actualOwned = getActualOwnedQuantity(item);
  const currentlyListed = getCurrentlyListedQuantity(item);
  const availableToList = getAvailableToListQuantity(item);
  const listedItems = item.numListed;
  const circulation = item.numCirculation;

  const listDisabled = availableToList < 1 && currentlyListed < 1;

  const activateDisabled =
    item.assetName !== "SKINS" ||
    actualOwned < 1 ||
    activeSkin ||
    actualOwned - currentlyListed < 1;

  const listTooltip = getListTooltip(item.assetName, availableToList, activeSkin);
  const activeTooltip = getActivateTooltip(
    item.assetName,
    actualOwned,
    currentlyListed,
    activeSkin
  );
  const ownedTooltip = getOwnedTooltip(actualOwned, currentlyListed);

  const image = item.assetName === "DEEDS" ? getDeedImg(item.displayName) : item.image;

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
      <Stack direction="column" justifyContent="center" alignItems="center" spacing={0.1}>
        <Typography variant="subtitle2" align="center" noWrap title={item.displayName}>
          {item.displayName}
        </Typography>
        <Tooltip title={`Circulation`}>
          <Typography variant="caption" color="text.secondary" align="center" noWrap>
            {`(x${largeNumberFormat(circulation)})`}
          </Typography>
        </Tooltip>
      </Stack>
      <Box
        component="img"
        src={image ?? ""}
        alt={item.displayName}
        sx={{
          width: "100%",
          height: 180,
          objectFit: "contain",
          opacity: actualOwned > 0 ? 1 : 0.5,
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
        <Chip
          label={
            <Stack direction="row" spacing={0.5} alignItems="center">
              <span>{actualOwned > 0 ? `Owned x${actualOwned}` : "Not owned"}</span>

              {ownedTooltip.includes("Listed") && (
                <Tooltip title={ownedTooltip}>
                  <InfoIcon fontSize="inherit" />
                </Tooltip>
              )}
            </Stack>
          }
          color={actualOwned > 0 ? "success" : "default"}
          size="small"
        />
        <Chip
          label={listedItems > 0 ? `Market x${largeNumberFormat(listedItems)}` : "No market"}
          color={listedItems > 0 ? "warning" : "default"}
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
          disabled={listedItems === 0}
          onClick={() => onAction("buy", item)}
          fullWidth
        >
          <FaTag style={{ width: "1.1rem", height: "1.1rem" }} />
        </Button>
        <Button
          variant="outlined"
          size="small"
          title="Transfer"
          disabled={actualOwned === 0}
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
        <Tooltip title={activeTooltip}>
          <Box sx={{ width: "100%", display: "flex" }}>
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
          </Box>
        </Tooltip>
      )}
    </Stack>
  );
}
