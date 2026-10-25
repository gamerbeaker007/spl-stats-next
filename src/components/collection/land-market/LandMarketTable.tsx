"use client";

import { LivePriceValue } from "@/components/collection/cards/LivePrice";

import {
  LandDetailIcons,
  LandRarityIcon,
  LandResourceIcons,
  LandTerrainIcon,
  LandTypeIcons,
  LandWorksiteResourceIcon,
} from "@/components/collection/land-market/LandAttributeIcons";
import LandCartButton from "@/components/collection/land-market/LandCartButton";
import LandDeedImage from "@/components/collection/land-market/LandDeedImage";
import ScrollableTableContainer from "@/components/shared/ScrollableTableContainer";
import type { LandCartState } from "@/hooks/land-market/useLandCart";
import { formatLandPriceUsd, formatListingAge } from "@/lib/shared/land-deed-utils";
import type {
  LandMarketListing,
  LandMarketSort,
  LandMarketSortField,
} from "@/types/land/landMarket";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";

interface Column {
  label: string;
  /** Compact header text; the full `label` is shown on hover/focus. */
  short?: string;
  sortField?: LandMarketSortField;
  align?: "left" | "right" | "center";
}

const COLUMNS: Column[] = [
  { label: "Deed" },
  { label: "Location", sortField: "location" },
  { label: "Region" },
  { label: "Plot Type", short: "P", align: "center" },
  { label: "Rarity", short: "R", sortField: "rarity", align: "center" },
  { label: "Land Type", short: "L", align: "center" },
  // "R" is taken by Rarity.
  { label: "Resource", short: "Re", align: "center" },
  { label: "Current Building" },
  { label: "Details", short: "D", align: "center" },
  { label: "Seller" },
  { label: "Since", sortField: "since" },
  { label: "Price", sortField: "price", align: "right" },
  { label: "Cart", align: "center" },
];

/** Narrow padding for the icon columns. */
const ICON_CELL_SX = { px: 0.75 } as const;

function HeaderLabel({ column }: Readonly<{ column: Column }>) {
  if (!column.short) return <>{column.label}</>;
  return (
    <Tooltip title={column.label} arrow>
      <span tabIndex={0} aria-label={column.label}>
        {column.short}
      </span>
    </Tooltip>
  );
}

interface LandMarketTableProps {
  listings: LandMarketListing[];
  sort: LandMarketSort;
  onSortChange: (field: LandMarketSortField) => void;
  getCartState: (listing: LandMarketListing) => LandCartState;
  onToggleCart: (listing: LandMarketListing) => void;
  now: number;
}

export default function LandMarketTable({
  listings,
  sort,
  onSortChange,
  getCartState,
  onToggleCart,
  now,
}: Readonly<LandMarketTableProps>) {
  return (
    <ScrollableTableContainer maxHeight={{ xs: "none", md: "70vh" }}>
      <Table size="small" stickyHeader aria-label="Land market listings">
        <TableHead>
          <TableRow>
            {COLUMNS.map((column) => {
              const active = column.sortField !== undefined && sort.field === column.sortField;
              return (
                <TableCell
                  key={column.label}
                  align={column.align}
                  sortDirection={active ? sort.direction : false}
                  sx={{ whiteSpace: "nowrap", fontWeight: 600, ...(column.short && ICON_CELL_SX) }}
                >
                  {column.sortField ? (
                    <TableSortLabel
                      active={active}
                      direction={active ? sort.direction : "asc"}
                      onClick={() => onSortChange(column.sortField!)}
                    >
                      <HeaderLabel column={column} />
                    </TableSortLabel>
                  ) : (
                    <HeaderLabel column={column} />
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {listings.map((listing) => (
            <TableRow key={listing.listingItemId} hover>
              <TableCell sx={{ py: 0.5 }}>
                <LandDeedImage
                  src={listing.imageUrl}
                  alt={`Deed artwork ${listing.location}`}
                  sx={{ width: 72, height: 46, borderRadius: 0.75 }}
                />
              </TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                  {listing.location}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: "monospace", display: "block" }}
                >
                  {listing.deedUid}
                </Typography>
              </TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Typography variant="body2">
                  {listing.regionName || "-"} (#{listing.regionNumber})
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {listing.territory || "-"}
                </Typography>
              </TableCell>
              <TableCell sx={ICON_CELL_SX}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <LandTerrainIcon listing={listing} />
                </Box>
              </TableCell>
              <TableCell sx={ICON_CELL_SX}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <LandRarityIcon listing={listing} />
                </Box>
              </TableCell>
              <TableCell sx={ICON_CELL_SX}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <LandTypeIcons listing={listing} />
                </Box>
              </TableCell>
              <TableCell sx={ICON_CELL_SX}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <LandResourceIcons listing={listing} />
                </Box>
              </TableCell>
              <TableCell sx={ICON_CELL_SX}>
                <Box display={"flex"} gap={1} sx={{ justifyItems: "center" }}>
                  <LandWorksiteResourceIcon listing={listing} />
                  <Typography variant="body2">{listing.worksite}</Typography>
                </Box>
              </TableCell>
              <TableCell sx={ICON_CELL_SX}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <LandDetailIcons listing={listing} />
                </Box>
              </TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{listing.seller || "-"}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                <Tooltip
                  title={listing.listedAt ? new Date(listing.listedAt).toLocaleString() : ""}
                >
                  <span>{formatListingAge(listing.listedAt, now)}</span>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: "nowrap", fontWeight: 700 }}>
                <LivePriceValue value={listing.priceUsd}>
                  {formatLandPriceUsd(listing.priceUsd)}
                </LivePriceValue>
              </TableCell>
              <TableCell align="center">
                <LandCartButton
                  variant="icon"
                  state={getCartState(listing)}
                  location={listing.location}
                  onToggle={() => onToggleCart(listing)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollableTableContainer>
  );
}
