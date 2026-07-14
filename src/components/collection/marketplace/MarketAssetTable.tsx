"use client";

import type { MarketActionMode } from "@/components/collection/marketplace/MarketActionDialogHost";
import {
  formatAssetPriceLabel,
  getLowestPrice,
  getSkinListableQuantity,
  isSkinActive,
} from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { FaTag } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import { MdCheckCircle } from "react-icons/md";
import { SiHomeassistantcommunitystore } from "react-icons/si";
import TableSortLabel from "@mui/material/TableSortLabel";
import { useMemo, useState } from "react";

interface MarketAssetTableProps {
  items: MarketplaceAssetItem[];
  onAction: (mode: MarketActionMode, item: MarketplaceAssetItem) => void;
}

const iconStyle = { width: "1.05rem", height: "1.05rem" } as const;
type SortField = "displayName" | "numOwned" | "numListed" | "price";

/**
 * Dense table view of marketplace assets — the same items and actions as
 * `MarketAssetCard`, laid out as rows with buy/transfer/list buttons in the last
 * column. Used when the user prefers table layout over cards.
 */
export default function MarketAssetTable({ items, onAction }: Readonly<MarketAssetTableProps>) {
  const [sortBy, setSortBy] = useState<SortField>("price");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let result = 0;

      switch (sortBy) {
        case "displayName":
          result = a.displayName.localeCompare(b.displayName);
          break;
        case "numOwned":
          result = a.numOwned - b.numOwned;
          break;
        case "numListed":
          result = a.numListed - b.numListed;
          break;

        case "price":
          result = getLowestPrice(a) - getLowestPrice(b);
          break;
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [items, sortBy, sortDirection]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  }
  return (
    <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2 }}>
      <Table size="small" sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortBy === "displayName"}
                direction={sortBy === "displayName" ? sortDirection : "asc"}
                onClick={() => handleSort("displayName")}
              >
                Item
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === "numOwned"}
                direction={sortBy === "numOwned" ? sortDirection : "asc"}
                onClick={() => handleSort("numOwned")}
              >
                Owned
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === "numListed"}
                direction={sortBy === "numListed" ? sortDirection : "asc"}
                onClick={() => handleSort("numListed")}
              >
                Listed
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortBy === "price"}
                direction={sortBy === "price" ? sortDirection : "asc"}
                onClick={() => handleSort("price")}
              >
                Price
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedItems.map((item) => {
            const activeSkin = isSkinActive(item);
            const listableQty = getSkinListableQuantity(item);
            const listDisabled = item.assetName === "SKINS" ? listableQty < 1 : item.numOwned === 0;
            const listTooltip =
              item.assetName !== "SKINS"
                ? "List"
                : activeSkin && listableQty < 1
                  ? "Skin is currently active and cannot be listed."
                  : activeSkin
                    ? `1 active copy is locked. You can list up to ${listableQty}.`
                    : "List";

            return (
              <TableRow
                key={item.detailId}
                hover
                sx={
                  activeSkin
                    ? {
                        borderLeft: 2,
                        borderLeftColor: "success.main",
                        backgroundColor: "rgba(76, 175, 80, 0.06)",
                      }
                    : undefined
                }
              >
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      component="img"
                      src={item.image ?? ""}
                      alt={item.displayName}
                      sx={{
                        width: 36,
                        height: 36,
                        objectFit: "contain",
                        flexShrink: 0,
                        opacity: item.numOwned > 0 ? 1 : 0.5,
                      }}
                    />
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ maxWidth: 260 }}
                      title={item.displayName}
                    >
                      {item.displayName}
                      {activeSkin ? " (Active)" : ""}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="right">{item.numOwned}</TableCell>
                <TableCell align="right">{item.numListed}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {formatAssetPriceLabel(item)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      size="small"
                      title="Buy"
                      disabled={item.numListed === 0}
                      onClick={() => onAction("buy", item)}
                    >
                      <FaTag style={iconStyle} />
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      title="Transfer"
                      disabled={item.numOwned === 0}
                      onClick={() => onAction("transfer", item)}
                    >
                      <IoMdSend style={iconStyle} />
                    </Button>
                    <Tooltip title={listTooltip}>
                      <Box sx={{ display: "inline-flex" }}>
                        <Button
                          variant="outlined"
                          size="small"
                          title="List"
                          color={activeSkin ? "warning" : "primary"}
                          disabled={listDisabled}
                          onClick={() => onAction("list", item)}
                        >
                          <SiHomeassistantcommunitystore style={iconStyle} />
                        </Button>
                      </Box>
                    </Tooltip>
                    {item.assetName === "SKINS" && (
                      <Button
                        variant="outlined"
                        size="small"
                        color={activeSkin ? "success" : "primary"}
                        title="Activate"
                        disabled={item.numOwned < 1 || activeSkin || item.numListed > 0}
                        onClick={() => onAction("activate", item)}
                      >
                        <MdCheckCircle style={iconStyle} />
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
