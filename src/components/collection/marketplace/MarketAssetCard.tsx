"use client";

import type { MarketActionMode } from "@/components/collection/marketplace/MarketActionDialogHost";
import {
  getActivateTooltip,
  getActualOwnedQuantity,
  getAvailableToListQuantity,
  getCurrentlyListedQuantity,
  getDeedImg,
  getListTooltip,
  getLowestUsdPrice,
  isSkinActive,
} from "@/lib/shared/marketplace-assets";
import { largeNumberFormat } from "@/lib/utils";
import type { MarketplaceAssetItem, OutbidStatus } from "@/types/marketplace-assets";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircleOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { Box, Button, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { FaTag } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import { MdCheckCircle, MdOutlinePriceChange } from "react-icons/md";
import { SiHomeassistantcommunitystore } from "react-icons/si";

interface MarketAssetCardProps {
  item: MarketplaceAssetItem;
  onAction: (mode: MarketActionMode, item: MarketplaceAssetItem) => void;
  /** Render the item description prominently (e.g. Titles, where it is meaningful). */
  showDescription?: boolean;
  /** Outbid status for this item — shown as a warning chip when the listing is undercut. */
  outbidStatus?: OutbidStatus | null;
  /** My active listing count for this item (filtered to this asset type/detailId). */
  myListingCount?: number;
  /** Logged-out mode hides ownership metrics and disables account actions. */
  isAuthenticated?: boolean;
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
  outbidStatus = null,
  myListingCount = 0,
  isAuthenticated = true,
}: Readonly<MarketAssetCardProps>) {
  const activeSkin = isSkinActive(item);
  const actualOwned = getActualOwnedQuantity(item);
  const currentlyListed = getCurrentlyListedQuantity(item);
  const availableToList = getAvailableToListQuantity(item);
  const listedItems = item.numListed;
  const circulation = item.numCirculation;

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
  const lowestUsd = getLowestUsdPrice(item.prices);
  const activeMyListings = Math.max(0, myListingCount);
  const showListingStatusRow =
    isAuthenticated && (activeMyListings > 0 || Boolean(outbidStatus?.isOutbid));

  const buyDisabled = !isAuthenticated || listedItems === 0;
  const transferDisabled = !isAuthenticated || actualOwned === 0;
  const listDisabledWithAuth = availableToList < 1 && currentlyListed < 1;
  const listDisabledFinal = !isAuthenticated || listDisabledWithAuth;
  const activateDisabledFinal = !isAuthenticated || activateDisabled;

  const buyTooltip = !isAuthenticated
    ? "Log in to buy"
    : listedItems > 0
      ? "Buy"
      : "No active listings to buy";
  const transferTooltip = !isAuthenticated
    ? "Log in to transfer"
    : actualOwned > 0
      ? "Transfer"
      : "No owned quantity to transfer";
  const listActionTooltip = !isAuthenticated ? "Log in to list" : listTooltip;
  const activateActionTooltip = !isAuthenticated ? "Log in to activate" : activeTooltip;
  const cardButtonSx = {
    minWidth: 0,
    px: 0.75,
    py: 0.25,
    minHeight: 30,
    borderRadius: 1.25,
    flex: 1,
    textTransform: "none",
    fontSize: "0.72rem",
    lineHeight: 1.1,
  } as const;

  return (
    <Stack
      spacing={1}
      sx={{
        width: 220,
        px: 1,
        borderRadius: 2,
        border: activeSkin ? 2 : 1,
        borderColor: activeSkin ? "success.main" : "divider",
        backgroundColor: "background.paper",
        boxShadow: activeSkin ? "0 0 0 1px rgba(76, 175, 80, 0.15)" : "none",
      }}
    >
      <Typography variant="caption" align="center" title={item.displayName} pt={1}>
        {item.displayName}
      </Typography>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Tooltip title="Market listed quantity">
          <Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: "text.secondary" }}>
            <StorefrontOutlinedIcon sx={{ fontSize: "0.92rem" }} />
            <Typography variant="caption">{largeNumberFormat(listedItems)}</Typography>
          </Stack>
        </Tooltip>
        <Tooltip title="Circulation">
          <Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: "text.secondary" }}>
            <ChangeCircleIcon sx={{ fontSize: "0.92rem" }} />
            <Typography variant="caption">{largeNumberFormat(circulation)}</Typography>
          </Stack>
        </Tooltip>
      </Stack>

      <Box
        sx={{
          borderRadius: 1.5,
          border: 1,
          borderColor: "divider",
          p: 0.6,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 152,
          backgroundColor: "background.default",
        }}
      >
        <Box
          component="img"
          src={image ?? ""}
          alt={item.displayName}
          sx={{
            width: "100%",
            height: 210,
            objectFit: "contain",
            opacity: isAuthenticated && actualOwned === 0 ? 0.5 : 1,
          }}
        />
      </Box>

      {item.setName && (
        <Typography variant="caption" color="text.secondary" align="center" noWrap>
          {item.setName}
        </Typography>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        {isAuthenticated ? (
          <Tooltip title={ownedTooltip}>
            <Typography
              variant="caption"
              color={actualOwned > 0 ? "success.main" : "text.secondary"}
            >
              Owned: {largeNumberFormat(actualOwned)}
            </Typography>
          </Tooltip>
        ) : (
          <Typography variant="caption" color="text.secondary">
            Listed {largeNumberFormat(listedItems)}
          </Typography>
        )}
        <Typography variant="caption">
          Lowest: <strong>{lowestUsd !== null ? `$${lowestUsd.toFixed(2)}` : "-"}</strong>
        </Typography>
      </Stack>

      {showDescription && item.description && (
        <Typography variant="caption" color="text.secondary" title={item.description}>
          {item.description}
        </Typography>
      )}

      {showListingStatusRow && (
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          {activeMyListings > 0 ? (
            <Tooltip title="My active listing quantity">
              <Stack direction="row" spacing={0.4} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  My Listings: <strong>{activeMyListings}</strong>
                </Typography>
              </Stack>
            </Tooltip>
          ) : (
            <Box />
          )}

          {outbidStatus?.isOutbid && (
            <Tooltip
              title={`Your listing ($${outbidStatus.myPrice.toFixed(2)} ${outbidStatus.currency}) is undercut — lowest competing price is $${outbidStatus.lowestMarketPrice.toFixed(2)} ${outbidStatus.currency}`}
            >
              <Chip
                icon={<MdOutlinePriceChange style={{ fontSize: "0.9rem" }} />}
                label="Outbid"
                color="warning"
                size="small"
                sx={{ fontWeight: 700, height: 22 }}
              />
            </Tooltip>
          )}
        </Stack>
      )}

      <Stack direction="row" spacing={0.6}>
        <Tooltip title={buyTooltip}>
          <Box sx={{ width: "100%", display: "flex" }}>
            <Button
              variant="outlined"
              size="small"
              title="Buy"
              disabled={buyDisabled}
              onClick={() => onAction("buy", item)}
              fullWidth
              sx={cardButtonSx}
            >
              <FaTag style={{ width: "1.1rem", height: "1.1rem" }} />
            </Button>
          </Box>
        </Tooltip>
        <Tooltip title={transferTooltip}>
          <Box sx={{ width: "100%", display: "flex" }}>
            <Button
              variant="outlined"
              size="small"
              title="Transfer"
              disabled={transferDisabled}
              onClick={() => onAction("transfer", item)}
              fullWidth
              sx={cardButtonSx}
            >
              <IoMdSend style={{ width: "1.1rem", height: "1.1rem" }} />
            </Button>
          </Box>
        </Tooltip>
        <Tooltip title={listActionTooltip}>
          <Box sx={{ width: "100%", display: "flex" }}>
            <Button
              variant="outlined"
              size="small"
              title="List"
              color={activeSkin ? "warning" : "primary"}
              disabled={listDisabledFinal}
              onClick={() => onAction("list", item)}
              fullWidth
              sx={cardButtonSx}
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
        <Tooltip title={activateActionTooltip}>
          <Box pb={1} sx={{ width: "100%", display: "flex" }}>
            <Button
              variant="outlined"
              size="small"
              color={activeSkin ? "success" : "primary"}
              title="Activate"
              disabled={activateDisabledFinal}
              onClick={() => onAction("activate", item)}
              fullWidth
              sx={{ ...cardButtonSx, minHeight: 28 }}
            >
              <Stack direction="row" spacing={0.45} alignItems="center">
                <MdCheckCircle style={{ width: "0.9rem", height: "0.9rem" }} />
                <span>Activate</span>
              </Stack>
            </Button>
          </Box>
        </Tooltip>
      )}
    </Stack>
  );
}
