"use client";

import MarketAssetSummary from "@/components/collection/marketplace/MarketAssetSummary";
import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import { useMarketAssetBalances } from "@/hooks/collection/useMarketAssetBalances";
import { useMarketplaceAssetListings } from "@/hooks/collection/useMarketplaceAssetListings";
import { useMarketplaceTransaction } from "@/hooks/collection/useMarketplaceTransaction";
import { buildMarketplaceAssetPurchasePayloadAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { broadcastMarketplaceAssetPurchase } from "@/lib/frontend/purchase/splBroadcast";
import { selectCheapestListings } from "@/lib/shared/marketplace-assets";
import { credits_icon_url, dec_icon_url } from "@/lib/staticsIconUrls";
import { largeNumberFormat } from "@/lib/utils";
import type { MarketplaceAssetItem, MarketplaceAssetName } from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";
import {
  Alert,
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useMemo, useState } from "react";

const LISTINGS_PAGE_SIZE = 5;

interface BuyAssetDialogProps {
  open: boolean;
  assetName: MarketplaceAssetName;
  account: string;
  item: MarketplaceAssetItem;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

function normalizeAccount(account: string): string {
  return account.trim().toLowerCase();
}

export default function BuyAssetDialog({
  open,
  assetName,
  account,
  item,
  onClose,
  onCompleted,
}: Readonly<BuyAssetDialogProps>) {
  const {
    listings,
    loading: listingsLoading,
    error: listingsError,
  } = useMarketplaceAssetListings(assetName, item.detailId, open);
  const {
    balances,
    loading: balancesLoading,
    error: balancesError,
    refresh: refreshBalances,
  } = useMarketAssetBalances(account, open);

  const { busy, txProgress, error: submitError, run } = useMarketplaceTransaction(onCompleted);

  const [rawQuantity, setRawQuantity] = useState(1);
  const [buyPage, setBuyPage] = useState(0);

  const sortedListings = useMemo(
    () =>
      [...listings].sort((left, right) => {
        const priceDiff = left.price - right.price;
        if (priceDiff !== 0) return priceDiff;
        return left.listingItemId - right.listingItemId;
      }),
    [listings]
  );

  const maxQuantity = useMemo(() => {
    const normalized = normalizeAccount(account);
    const available = listings.reduce((sum, listing) => {
      if (normalizeAccount(listing.seller) === normalized) return sum;
      return sum + Math.max(0, listing.quantityRemaining);
    }, 0);
    return Math.max(1, available);
  }, [account, listings]);

  // Clamp during render (listings load asynchronously) rather than syncing via effects.
  const quantity = Math.min(rawQuantity, maxQuantity);
  const pageCount = Math.max(1, Math.ceil(sortedListings.length / LISTINGS_PAGE_SIZE));
  const safePage = Math.min(buyPage, pageCount - 1);

  const decSelection = useMemo(
    () => selectCheapestListings(sortedListings, quantity, "DEC", account),
    [account, quantity, sortedListings]
  );
  const creditsSelection = useMemo(
    () => selectCheapestListings(sortedListings, quantity, "CREDITS", account),
    [account, quantity, sortedListings]
  );

  const estimatedCostDec = decSelection.fulfilled ? decSelection.totalCost : null;
  const estimatedCostCredits = creditsSelection.fulfilled ? creditsSelection.totalCost : null;
  const canBuyDec = estimatedCostDec !== null && balances.dec >= estimatedCostDec;
  const canBuyCredits = estimatedCostCredits !== null && balances.credits >= estimatedCostCredits;

  const pagedListings = useMemo(() => {
    const start = safePage * LISTINGS_PAGE_SIZE;
    return sortedListings.slice(start, start + LISTINGS_PAGE_SIZE);
  }, [safePage, sortedListings]);

  async function handleBuy(currency: PurchaseCurrency) {
    await run({
      label: `Buy (${currency})`,
      message: `Purchasing ${quantity} item${quantity === 1 ? "" : "s"}...`,
      execute: async () => {
        const { payload } = await buildMarketplaceAssetPurchasePayloadAction({
          account,
          assetName,
          detailId: item.detailId,
          currency,
          quantity,
        });
        return broadcastMarketplaceAssetPurchase(account, payload);
      },
      onVerified: refreshBalances,
    });
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="h6">Buy</Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <Typography variant="body2">{account}: </Typography>
            <Avatar src={dec_icon_url} alt="DEC" sx={{ width: 16, height: 16 }} />
            <Typography variant="body2">{largeNumberFormat(balances.dec)}</Typography>
            <Divider orientation="vertical" flexItem />
            <Avatar src={credits_icon_url} alt="CREDITS" sx={{ width: 16, height: 16 }} />
            <Typography variant="body2">{largeNumberFormat(balances.credits)}</Typography>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          <MarketAssetSummary item={item} />

          {listingsLoading && <Alert severity="info">Loading live marketplace listings...</Alert>}
          {listingsError && <Alert severity="error">{listingsError}</Alert>}
          {!listingsLoading && listings.length === 0 && !listingsError && (
            <Alert severity="warning">No active listings were found for this item.</Alert>
          )}

          {listings.length > 0 && (
            <>
              <Typography variant="body2" color="text.secondary">
                Using cheapest listing combinations across all marketplace sellers.
              </Typography>

              <TextField
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  setRawQuantity(Math.max(1, Math.min(maxQuantity, Math.floor(next))));
                }}
                inputProps={{ min: 1, max: maxQuantity }}
                fullWidth
              />

              {balancesLoading && <Alert severity="info">Loading account balances...</Alert>}
              {balancesError && <Alert severity="error">{balancesError}</Alert>}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="left">Qty</TableCell>
                      <TableCell align="left">USD</TableCell>
                      <TableCell align="right">Seller</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedListings.map((listing) => {
                      const isOwnListing =
                        normalizeAccount(listing.seller) === normalizeAccount(account);
                      const isSelected =
                        (decSelection.plan.get(listing.listingItemId) ?? 0) > 0 ||
                        (creditsSelection.plan.get(listing.listingItemId) ?? 0) > 0;

                      return (
                        <TableRow
                          key={listing.listingItemId}
                          sx={{
                            backgroundColor: isSelected ? "action.selected" : undefined,
                            opacity: isOwnListing ? 0.6 : 1,
                          }}
                        >
                          <TableCell align="left">{listing.quantityRemaining}</TableCell>
                          <TableCell align="left">{listing.price.toFixed(3)}</TableCell>
                          <TableCell align="right">{listing.seller}</TableCell>
                        </TableRow>
                      );
                    })}
                    {pagedListings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No listings available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={sortedListings.length}
                  page={safePage}
                  onPageChange={(_event, newPage) => setBuyPage(newPage)}
                  onRowsPerPageChange={() => setBuyPage(0)}
                  rowsPerPage={LISTINGS_PAGE_SIZE}
                  rowsPerPageOptions={[LISTINGS_PAGE_SIZE]}
                />
              </TableContainer>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                <Tooltip
                  title={
                    estimatedCostDec === null
                      ? "Not enough DEC-priced listing quantity for this amount"
                      : !canBuyDec
                        ? `Insufficient DEC (${estimatedCostDec.toFixed(3)} required)`
                        : ""
                  }
                >
                  <span style={{ width: "100%" }}>
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={busy || balancesLoading || estimatedCostDec === null || !canBuyDec}
                      onClick={() => handleBuy("DEC")}
                    >
                      {busy ? (
                        "Processing..."
                      ) : (
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Image src={dec_icon_url} alt="DEC" width={25} height={25} />
                          <Typography variant="inherit">
                            {estimatedCostDec?.toFixed(3) ?? "N/A"}
                          </Typography>
                        </Stack>
                      )}
                    </Button>
                  </span>
                </Tooltip>

                <Tooltip
                  title={
                    estimatedCostCredits === null
                      ? "Not enough Credits-priced listing quantity for this amount"
                      : !canBuyCredits
                        ? `Insufficient Credits (${estimatedCostCredits.toFixed(0)} required)`
                        : ""
                  }
                >
                  <span style={{ width: "100%" }}>
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={
                        busy || balancesLoading || estimatedCostCredits === null || !canBuyCredits
                      }
                      onClick={() => handleBuy("CREDITS")}
                    >
                      {busy ? (
                        "Processing..."
                      ) : (
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Image src={credits_icon_url} alt="Credits" width={25} height={25} />
                          <Typography variant="inherit">
                            {estimatedCostCredits?.toFixed(0) ?? "N/A"}
                          </Typography>
                        </Stack>
                      )}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </>
          )}

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <TransactionProgressPanel txProgress={txProgress} />
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
