"use client";

import CurrencyAmountChip from "@/components/collection/top-bar/CurrencyAmountChip";
import ScrollableTableContainer from "@/components/shared/ScrollableTableContainer";
import { BuyMissingCcListing } from "@/types/buy-missing-cc";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import ManualSelectionTotalsBar from "./ManualSelectionTotalsBar";

type SortBy = "level" | "cc" | "priceUsd" | "priceDec" | "priceCredits" | "pricePerCcDec";

interface ManualListingsTabContentProps {
  listingLevels: number[];
  levelFilter: number | "all";
  setLevelFilter: (value: number | "all") => void;
  pageSize: number;
  setPageSize: (value: 20 | 50 | 100) => void;
  pageOptions: readonly [20, 50, 100];
  sortBy: SortBy;
  sortDir: "asc" | "desc";
  toggleSort: (value: SortBy) => void;
  pagedRows: BuyMissingCcListing[];
  loading: boolean;
  selectedIds: string[];
  inCartSet: Set<string>;
  reservedByOtherAccountSet: Set<string>;
  page: number;
  pageCount: number;
  setPage: (value: number) => void;
  toggleCartByButton: (clickedGlobalIndex: number, shiftKey: boolean) => void;
  selectionTotals: {
    count: number;
    cc: number;
    usd: number;
    dec: number;
    credits: number;
  };
}

export default function ManualListingsTabContent({
  listingLevels,
  levelFilter,
  setLevelFilter,
  pageSize,
  setPageSize,
  pageOptions,
  sortBy,
  sortDir,
  toggleSort,
  pagedRows,
  loading,
  selectedIds,
  inCartSet,
  reservedByOtherAccountSet,
  page,
  pageCount,
  setPage,
  toggleCartByButton,
  selectionTotals,
}: Readonly<ManualListingsTabContentProps>) {
  return (
    <>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Listing Level</InputLabel>
          <Select
            label="Listing Level"
            value={levelFilter}
            onChange={(e) => {
              const v = e.target.value;
              setLevelFilter(v === "all" ? "all" : Number(v));
            }}
          >
            <MenuItem value="all">All levels</MenuItem>
            {listingLevels.map((level) => (
              <MenuItem key={level} value={level}>
                Level {level}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Rows</InputLabel>
          <Select
            label="Rows"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as 20 | 50 | 100)}
          >
            {pageOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <ScrollableTableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Cart</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "level"}
                  direction={sortBy === "level" ? sortDir : "asc"}
                  onClick={() => toggleSort("level")}
                >
                  Level
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "cc"}
                  direction={sortBy === "cc" ? sortDir : "asc"}
                  onClick={() => toggleSort("cc")}
                >
                  CC
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "priceUsd"}
                  direction={sortBy === "priceUsd" ? sortDir : "asc"}
                  onClick={() => toggleSort("priceUsd")}
                >
                  USD
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "priceDec"}
                  direction={sortBy === "priceDec" ? sortDir : "asc"}
                  onClick={() => toggleSort("priceDec")}
                >
                  DEC
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "priceCredits"}
                  direction={sortBy === "priceCredits" ? sortDir : "asc"}
                  onClick={() => toggleSort("priceCredits")}
                >
                  Credits
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "pricePerCcDec"}
                  direction={sortBy === "pricePerCcDec" ? sortDir : "asc"}
                  onClick={() => toggleSort("pricePerCcDec")}
                >
                  DEC/CC
                </TableSortLabel>
              </TableCell>
              <TableCell>Seller</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row, idx) => {
              const globalIndex = (page - 1) * pageSize + idx;
              const inCart = inCartSet.has(row.marketId);
              const reservedByOther = reservedByOtherAccountSet.has(row.marketId);
              const cannotAddBecauseReserved = !inCart && reservedByOther;
              const cartButtonTooltip = cannotAddBecauseReserved
                ? "This marketplace listing is already reserved by another account in your purchase plan."
                : inCart
                  ? "Remove from cart"
                  : "Add to cart";

              return (
                <TableRow key={row.marketId} selected={selectedIds.includes(row.marketId)}>
                  <TableCell>
                    <Tooltip title={cartButtonTooltip}>
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          color={inCart ? "error" : "success"}
                          disabled={cannotAddBecauseReserved}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={(event) => toggleCartByButton(globalIndex, event.shiftKey)}
                          sx={{
                            minWidth: 36,
                            px: 1,
                            textTransform: "none",
                            "&:hover": { opacity: 0.9 },
                          }}
                        >
                          {inCart ? "-" : "+"}
                        </Button>
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{row.level}</TableCell>
                  <TableCell>{row.cc}</TableCell>
                  <TableCell>
                    <CurrencyAmountChip currency="USD" value={row.priceUsd} />
                  </TableCell>
                  <TableCell>
                    <CurrencyAmountChip currency="DEC" value={row.priceDec} />
                  </TableCell>
                  <TableCell>
                    <CurrencyAmountChip currency="CREDITS" value={row.priceCredits ?? 0} />
                  </TableCell>
                  <TableCell>{row.pricePerCcDec.toFixed(3)}</TableCell>
                  <TableCell>{row.seller ?? "-"}</TableCell>
                </TableRow>
              );
            })}
            {!loading && pagedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>No listings found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollableTableContainer>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          Shift-click on +/- applies add/remove to a row range.
        </Typography>
        <Pagination page={page} count={pageCount} onChange={(_e, p) => setPage(p)} />
      </Box>

      <ManualSelectionTotalsBar selectionTotals={selectionTotals} />
    </>
  );
}
