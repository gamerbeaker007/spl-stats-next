"use client";

import type { MarketActionMode } from "@/components/collection/marketplace/MarketActionDialogHost";
import {
  formatAssetPriceLabel,
  getActualOwnedQuantity,
  getAvailableToListQuantity,
  getDeedImg,
  getListTooltip,
  getLowestPrice,
  isSkinActive,
} from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetItem, OutbidStatus } from "@/types/marketplace-assets";
import {
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import TableSortLabel from "@mui/material/TableSortLabel";
import Image from "next/image";
import { useMemo, useState } from "react";
import { FaTag } from "react-icons/fa";
import { IoMdSend } from "react-icons/io";
import { MdCheckCircle, MdOutlinePriceChange } from "react-icons/md";
import { SiHomeassistantcommunitystore } from "react-icons/si";

interface MarketAssetTableProps {
  items: MarketplaceAssetItem[];
  onAction: (mode: MarketActionMode, item: MarketplaceAssetItem) => void;
  /** Per-item outbid statuses keyed by detailId. */
  outbidStatuses?: ReadonlyMap<string, OutbidStatus>;
  isAuthenticated?: boolean;
}

const iconStyle = { width: "1.05rem", height: "1.05rem" } as const;
type SortField = "displayName" | "circulation" | "numOwned" | "numListed" | "price";

/**
 * Dense table view of marketplace assets — the same items and actions as
 * `MarketAssetCard`, laid out as rows with buy/transfer/list buttons in the last
 * column. Used when the user prefers table layout over cards.
 */
export default function MarketAssetTable({
  items,
  onAction,
  outbidStatuses,
  isAuthenticated = true,
}: Readonly<MarketAssetTableProps>) {
  const [sortBy, setSortBy] = useState<SortField>("price");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const sortedItems = useMemo(() => {
    const withMetrics = items.map((item) => ({
      item,
      actualOwned: getActualOwnedQuantity(item),
      lowestPrice: getLowestPrice(item),
    }));

    withMetrics.sort((a, b) => {
      let result = 0;

      switch (sortBy) {
        case "displayName":
          result = a.item.displayName.localeCompare(b.item.displayName);
          break;
        case "circulation":
          result = a.item.numCirculation - b.item.numCirculation;
          break;
        case "numOwned":
          result = a.actualOwned - b.actualOwned;
          break;
        case "numListed":
          result = a.item.numListed - b.item.numListed;
          break;

        case "price":
          result = a.lowestPrice - b.lowestPrice;
          break;
      }

      return sortDirection === "asc" ? result : -result;
    });

    return withMetrics.map((entry) => entry.item);
  }, [items, sortBy, sortDirection]);

  const maxPage = Math.max(0, Math.ceil(sortedItems.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, maxPage);

  const paginatedItems = useMemo(() => {
    const start = currentPage * rowsPerPage;
    return sortedItems.slice(start, start + rowsPerPage);
  }, [currentPage, rowsPerPage, sortedItems]);

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
                active={sortBy === "circulation"}
                direction={sortBy === "circulation" ? sortDirection : "asc"}
                onClick={() => handleSort("circulation")}
              >
                Circulation
              </TableSortLabel>
            </TableCell>
            {isAuthenticated && (
              <TableCell align="right">
                <TableSortLabel
                  active={sortBy === "numOwned"}
                  direction={sortBy === "numOwned" ? sortDirection : "asc"}
                  onClick={() => handleSort("numOwned")}
                >
                  Owned
                </TableSortLabel>
              </TableCell>
            )}
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
          {paginatedItems.map((item) => {
            const activeSkin = isSkinActive(item);
            const actualOwned = getActualOwnedQuantity(item);
            const availableToList = getAvailableToListQuantity(item);
            const listedItems = item.numListed;
            const listDisabled = availableToList < 1 && item.currentlyListed === 0;
            const listTooltip = getListTooltip(
              item.assetName,
              availableToList,
              activeSkin,
              item.currentlyListed
            );
            const outbid = outbidStatuses?.get(item.detailId) ?? null;

            const image = item.assetName === "DEEDS" ? getDeedImg(item.displayName) : item.image;

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
                    : isAuthenticated && outbid?.isOutbid
                      ? { borderLeft: 2, borderLeftColor: "warning.main" }
                      : undefined
                }
              >
                <TableCell>
                  <Tooltip
                    followCursor
                    placement="right"
                    title={
                      <Image
                        src={image ?? ""}
                        alt={item.displayName}
                        width={180}
                        height={180} // required by Image
                        style={{
                          width: 180,
                          height: "auto",
                        }}
                      />
                    }
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        component="img"
                        src={image ?? ""}
                        alt={item.displayName}
                        sx={{
                          width: 36,
                          height: 36,
                          objectFit: "contain",
                          flexShrink: 0,
                          opacity: isAuthenticated && actualOwned < 1 ? 0.5 : 1,
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
                  </Tooltip>
                </TableCell>
                <TableCell align="right">{item.numCirculation}</TableCell>
                {isAuthenticated && <TableCell align="right">{actualOwned}</TableCell>}
                <TableCell align="right">{item.numListed}</TableCell>
                <TableCell align="right">
                  <Stack direction="column" spacing={0.5} alignItems="flex-end">
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {formatAssetPriceLabel(item)}
                    </Typography>
                    {isAuthenticated && outbid?.isOutbid && (
                      <Tooltip
                        title={`Your listing ($${outbid.myPrice.toFixed(2)} ${outbid.currency}) is undercut — lowest competing price is $${outbid.lowestMarketPrice.toFixed(2)} ${outbid.currency}`}
                      >
                        <Chip
                          icon={<MdOutlinePriceChange style={{ fontSize: "0.85rem" }} />}
                          label={`Outbid $${outbid.lowestMarketPrice.toFixed(2)}`}
                          color="warning"
                          size="small"
                          sx={{ fontWeight: "bold", cursor: "help" }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title={isAuthenticated ? "Buy" : "Log in to buy"}>
                      <Box sx={{ display: "inline-flex" }}>
                        <Button
                          variant="outlined"
                          size="small"
                          title="Buy"
                          disabled={!isAuthenticated || listedItems === 0}
                          onClick={() => onAction("buy", item)}
                        >
                          <FaTag style={iconStyle} />
                        </Button>
                      </Box>
                    </Tooltip>
                    <Tooltip title={isAuthenticated ? "Transfer" : "Log in to transfer"}>
                      <Box sx={{ display: "inline-flex" }}>
                        <Button
                          variant="outlined"
                          size="small"
                          title="Transfer"
                          disabled={!isAuthenticated || actualOwned === 0}
                          onClick={() => onAction("transfer", item)}
                        >
                          <IoMdSend style={iconStyle} />
                        </Button>
                      </Box>
                    </Tooltip>
                    <Tooltip title={isAuthenticated ? listTooltip : "Log in to list"}>
                      <Box sx={{ display: "inline-flex" }}>
                        <Button
                          variant="outlined"
                          size="small"
                          title="List"
                          color={activeSkin ? "warning" : "primary"}
                          disabled={!isAuthenticated || listDisabled}
                          onClick={() => onAction("list", item)}
                        >
                          <SiHomeassistantcommunitystore style={iconStyle} />
                        </Button>
                      </Box>
                    </Tooltip>
                    {item.assetName === "SKINS" && (
                      <Tooltip title={isAuthenticated ? "Activate" : "Log in to activate"}>
                        <Box sx={{ display: "inline-flex" }}>
                          <Button
                            variant="outlined"
                            size="small"
                            color={activeSkin ? "success" : "primary"}
                            title="Activate"
                            disabled={!isAuthenticated || actualOwned < 1 || activeSkin}
                            onClick={() => onAction("activate", item)}
                          >
                            <MdCheckCircle style={iconStyle} />
                          </Button>
                        </Box>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <TablePagination
        component="div"
        count={sortedItems.length}
        page={currentPage}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          const nextRowsPerPage = Number.parseInt(event.target.value, 10);
          setRowsPerPage(
            Number.isFinite(nextRowsPerPage) && nextRowsPerPage > 0 ? nextRowsPerPage : 50
          );
          setPage(0);
        }}
        rowsPerPageOptions={[25, 50, 100]}
      />
    </Box>
  );
}
