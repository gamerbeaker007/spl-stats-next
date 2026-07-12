"use client";

import TransactionProgressPanel, {
  type TxProgressState,
} from "@/components/shared/TransactionProgressPanel";
import { useMarketplaceSkinListings } from "@/hooks/collection/useMarketplaceSkinListings";
import {
  buildMarketplaceSkinListPayloadAction,
  buildMarketplaceSkinPurchasePayloadAction,
  buildTransferSkinPayloadAction,
  getMarketplaceSkinBalancesAction,
} from "@/lib/backend/actions/marketplace-assets-actions";
import {
  broadcastMarketplaceAssetPurchase,
  broadcastMarketplaceList,
  broadcastTransferSkins,
  waitForTransactions,
} from "@/lib/frontend/purchase/splBroadcast";
import { credits_icon_url, dec_icon_url } from "@/lib/staticsIconUrls";
import { largeNumberFormat } from "@/lib/utils";
import type { MarketplaceListingItem, MarketplaceSkinItem } from "@/types/marketplace-assets";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";
import {
  Alert,
  Avatar,
  Box,
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
import { useEffect, useMemo, useState } from "react";

type SkinActionMode = "buy" | "transfer" | "list";

interface SkinActionDialogProps {
  open: boolean;
  mode: SkinActionMode;
  account: string;
  skin: MarketplaceSkinItem | null;
  defaultListPriceUsd: number | null;
  onClose: () => void;
  onCompleted: () => void;
}

interface SkinBalances {
  dec: number;
  credits: number;
}

const BUY_LISTINGS_PAGE_SIZE = 5;

function extractErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getMaxQuantity(
  mode: SkinActionMode,
  skin: MarketplaceSkinItem | null,
  listings: MarketplaceListingItem[],
  account: string
): number {
  if (mode === "buy") {
    const available = listings.reduce((sum, listing) => {
      const isOwnListing = normalizeAccount(listing.seller) === normalizeAccount(account);
      if (isOwnListing) return sum;
      return sum + Math.max(0, listing.quantityRemaining);
    }, 0);
    return Math.max(1, available);
  }

  return Math.max(1, skin?.numOwned ?? 1);
}

function toUnitPrice(listing: MarketplaceListingItem, currency: PurchaseCurrency): number | null {
  if (currency === "DEC") return listing.priceDec;
  if (currency === "CREDITS") return listing.priceCredits;
  return null;
}

function normalizeAccount(account: string): string {
  return account.trim().toLowerCase();
}

function computeSelectedListingPlan(
  listings: MarketplaceListingItem[],
  quantity: number,
  currency: PurchaseCurrency,
  account: string
): Map<number, number> {
  const normalizedAccount = normalizeAccount(account);
  const sorted = listings
    .filter((listing) => {
      const unit = toUnitPrice(listing, currency);
      const isOwnListing = normalizeAccount(listing.seller) === normalizedAccount;
      return unit !== null && listing.quantityRemaining > 0 && !isOwnListing;
    })
    .sort((left, right) => {
      const leftUnit = toUnitPrice(left, currency) ?? Number.MAX_SAFE_INTEGER;
      const rightUnit = toUnitPrice(right, currency) ?? Number.MAX_SAFE_INTEGER;
      return leftUnit - rightUnit;
    });

  const selected = new Map<number, number>();
  let remaining = quantity;

  for (const listing of sorted) {
    if (remaining <= 0) break;
    const buyQty = Math.min(remaining, listing.quantityRemaining);
    if (buyQty < 1) continue;

    selected.set(listing.listingItemId, buyQty);
    remaining -= buyQty;
  }

  if (remaining > 0) {
    return new Map<number, number>();
  }

  return selected;
}

function calculateEstimatedCost(
  listings: MarketplaceListingItem[],
  quantity: number,
  currency: PurchaseCurrency,
  account: string
): number | null {
  if (quantity < 1) return null;

  const selected = computeSelectedListingPlan(listings, quantity, currency, account);
  if (selected.size === 0) return null;

  let total = 0;
  for (const listing of listings) {
    const buyQty = selected.get(listing.listingItemId);
    if (!buyQty) continue;
    const unit = toUnitPrice(listing, currency);
    if (unit === null) continue;
    total += unit * buyQty;
  }

  return Number(total.toFixed(3));
}

export default function SkinActionDialog({
  open,
  mode,
  account,
  skin,
  defaultListPriceUsd,
  onClose,
  onCompleted,
}: Readonly<SkinActionDialogProps>) {
  const {
    listings,
    loading: listingsLoading,
    error: listingsError,
  } = useMarketplaceSkinListings(skin?.detailId ?? "", open && mode === "buy" && Boolean(skin));

  const [balances, setBalances] = useState<SkinBalances>({ dec: 0, credits: 0 });
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [balancesLoadedAccount, setBalancesLoadedAccount] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [recipient, setRecipient] = useState("");
  const [priceUsd, setPriceUsd] = useState("1.000");
  const [buyPage, setBuyPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txProgress, setTxProgress] = useState<TxProgressState | null>(null);

  useEffect(() => {
    if (!open || !skin) return;

    setQuantity(1);
    setRecipient("");
    setPriceUsd(defaultListPriceUsd?.toFixed(3) ?? "1.000");
    setBuyPage(0);
    setSubmitError(null);
    setTxProgress(null);
  }, [defaultListPriceUsd, open, skin]);

  useEffect(() => {
    if (!account) {
      setBalances({ dec: 0, credits: 0 });
      setBalancesLoading(false);
      setBalancesError(null);
      setBalancesLoadedAccount(null);
      return;
    }

    if (balancesLoadedAccount === account) {
      return;
    }

    let active = true;

    async function loadBalances() {
      setBalancesLoading(true);
      setBalancesError(null);
      try {
        const next = await getMarketplaceSkinBalancesAction(account);
        if (!active) return;
        setBalances(next);
        setBalancesLoadedAccount(account);
      } catch (error) {
        if (!active) return;
        setBalancesError(error instanceof Error ? error.message : "Failed to load balances");
      } finally {
        if (active) {
          setBalancesLoading(false);
        }
      }
    }

    loadBalances();

    return () => {
      active = false;
    };
  }, [account, balancesLoadedAccount]);

  const maxQuantity = useMemo(
    () => getMaxQuantity(mode, skin, listings, account),
    [account, mode, skin, listings]
  );

  useEffect(() => {
    if (quantity > maxQuantity) {
      setQuantity(maxQuantity);
    }
  }, [maxQuantity, quantity]);

  const sortedListings = useMemo(
    () =>
      [...listings].sort((left, right) => {
        const priceDiff = left.price - right.price;
        if (priceDiff !== 0) return priceDiff;
        return left.listingItemId - right.listingItemId;
      }),
    [listings]
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(sortedListings.length / BUY_LISTINGS_PAGE_SIZE) - 1);
    if (buyPage > maxPage) {
      setBuyPage(maxPage);
    }
  }, [buyPage, sortedListings.length]);

  const estimatedCostDec = useMemo(
    () => calculateEstimatedCost(sortedListings, quantity, "DEC", account),
    [account, quantity, sortedListings]
  );
  const estimatedCostCredits = useMemo(
    () => calculateEstimatedCost(sortedListings, quantity, "CREDITS", account),
    [account, quantity, sortedListings]
  );

  const selectedDecListingPlan = useMemo(
    () => computeSelectedListingPlan(sortedListings, quantity, "DEC", account),
    [account, quantity, sortedListings]
  );
  const selectedCreditsListingPlan = useMemo(
    () => computeSelectedListingPlan(sortedListings, quantity, "CREDITS", account),
    [account, quantity, sortedListings]
  );

  const pagedListings = useMemo(() => {
    const start = buyPage * BUY_LISTINGS_PAGE_SIZE;
    return sortedListings.slice(start, start + BUY_LISTINGS_PAGE_SIZE);
  }, [buyPage, sortedListings]);

  const canBuyDec = estimatedCostDec !== null && balances.dec >= estimatedCostDec;
  const canBuyCredits = estimatedCostCredits !== null && balances.credits >= estimatedCostCredits;

  if (!skin) return null;
  const activeSkin = skin;

  async function verifyTransaction(txId: string, label: string): Promise<boolean> {
    const [confirmation] = await waitForTransactions([txId]);
    if (confirmation?.status.success) {
      setTxProgress({ status: "verified", txId, label });
      onCompleted();
      return true;
    }

    setTxProgress({
      status: "error",
      txId,
      label,
      error: confirmation?.status.message ?? "Transaction was not verified.",
    });
    return false;
  }

  async function handleBuy(currency: PurchaseCurrency) {
    setBusy(true);
    setSubmitError(null);

    try {
      setTxProgress({
        status: "processing",
        label: `Buy Skin (${currency})`,
        message: `Purchasing ${quantity} skin${quantity === 1 ? "" : "s"}...`,
      });

      const { payload } = await buildMarketplaceSkinPurchasePayloadAction({
        account,
        detailId: activeSkin.detailId,
        currency,
        quantity,
      });

      const txId = await broadcastMarketplaceAssetPurchase(account, payload);
      setTxProgress({ status: "processing", label: `Buy Skin (${currency})`, txId });
      const verified = await verifyTransaction(txId, `Buy Skin (${currency})`);
      if (verified) {
        try {
          const nextBalances = await getMarketplaceSkinBalancesAction(account);
          setBalances(nextBalances);
          setBalancesLoadedAccount(account);
          setBalancesError(null);
        } catch (error) {
          setBalancesError(
            error instanceof Error ? error.message : "Failed to refresh balances after purchase"
          );
        }
      }
    } catch (error) {
      const message = extractErrorMessage(error, "Failed to buy skin");
      setSubmitError(message);
      setTxProgress({ status: "error", label: `Buy Skin (${currency})`, error: message });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitNonBuy() {
    if (mode === "buy") return;

    setBusy(true);
    setSubmitError(null);

    try {
      if (mode === "transfer") {
        setTxProgress({
          status: "processing",
          label: "Transfer Skin",
          message: `Sending ${quantity} skin${quantity === 1 ? "" : "s"} to ${recipient}...`,
        });

        const { payload } = await buildTransferSkinPayloadAction({
          account,
          detailId: activeSkin.detailId,
          recipient,
          quantity,
        });

        const txId = await broadcastTransferSkins(account, payload);
        setTxProgress({ status: "processing", label: "Transfer Skin", txId });
        await verifyTransaction(txId, "Transfer Skin");
        return;
      }

      setTxProgress({
        status: "processing",
        label: "List Skin",
        message: `Listing ${quantity} skin${quantity === 1 ? "" : "s"} for ${priceUsd} USD...`,
      });

      const { payload } = await buildMarketplaceSkinListPayloadAction({
        account,
        detailId: activeSkin.detailId,
        quantity,
        priceUsd: Number(priceUsd),
      });

      const txId = await broadcastMarketplaceList(account, payload);
      setTxProgress({ status: "processing", label: "List Skin", txId });
      await verifyTransaction(txId, "List Skin");
    } catch (error) {
      const message = extractErrorMessage(error, `Failed to ${mode} skin`);
      setSubmitError(message);
      setTxProgress({ status: "error", label: `${mode} skin`, error: message });
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "buy" ? "Buy Skin" : mode === "transfer" ? "Transfer Skin" : "List Skin";
  const disableSubmit =
    busy ||
    (mode === "transfer" && recipient.trim().length === 0) ||
    (mode === "list" && Number(priceUsd) <= 0);
  const normalizedAccount = normalizeAccount(account);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="h6">{title}</Typography>
          {mode === "buy" && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "wrap" }}>
              <Typography variant="body2">{account}: </Typography>
              <Avatar src={dec_icon_url} alt="DEC" sx={{ width: 16, height: 16 }} />
              <Typography variant="body2">{largeNumberFormat(balances.dec)}</Typography>
              <Divider orientation="vertical" flexItem />
              <Avatar src={credits_icon_url} alt="CREDITS" sx={{ width: 16, height: 16 }} />
              <Typography variant="body2">{largeNumberFormat(balances.credits)}</Typography>
            </Stack>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Box
              component="img"
              src={skin.image ?? ""}
              alt={skin.displayName}
              sx={{ width: 160, height: 160, objectFit: "contain", alignSelf: "center" }}
            />

            <Stack spacing={1} flex={1}>
              <Typography variant="h6">{skin.displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {skin.baseCardName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Owned: {skin.numOwned} | Listed: {skin.numListed}
              </Typography>
              {skin.description && (
                <Typography variant="body2" color="text.secondary">
                  {skin.description}
                </Typography>
              )}
            </Stack>
          </Stack>

          {mode === "buy" && (
            <Stack spacing={2}>
              {listingsLoading && (
                <Alert severity="info">Loading live marketplace listings...</Alert>
              )}
              {listingsError && <Alert severity="error">{listingsError}</Alert>}
              {!listingsLoading && listings.length === 0 && !listingsError && (
                <Alert severity="warning">No active listings were found for this skin.</Alert>
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
                      setQuantity(Math.max(1, Math.min(maxQuantity, Math.floor(next))));
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
                            normalizeAccount(listing.seller) === normalizedAccount;
                          const decQty = selectedDecListingPlan.get(listing.listingId) ?? 0;
                          const creditsQty = selectedCreditsListingPlan.get(listing.listingId) ?? 0;
                          const isSelected = decQty > 0 || creditsQty > 0;

                          return (
                            <TableRow
                              key={listing.listingId}
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
                            <TableCell colSpan={7} align="center">
                              No listings available.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <TablePagination
                      component="div"
                      count={sortedListings.length}
                      page={buyPage}
                      onPageChange={(_event, newPage) => setBuyPage(newPage)}
                      onRowsPerPageChange={() => setBuyPage(0)}
                      rowsPerPage={BUY_LISTINGS_PAGE_SIZE}
                      rowsPerPageOptions={[BUY_LISTINGS_PAGE_SIZE]}
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
                          disabled={
                            busy || balancesLoading || estimatedCostDec === null || !canBuyDec
                          }
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
                            busy ||
                            balancesLoading ||
                            estimatedCostCredits === null ||
                            !canBuyCredits
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
            </Stack>
          )}

          {mode === "transfer" && (
            <Stack spacing={2}>
              <TextField
                label="Recipient"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                fullWidth
              />
              <TextField
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  setQuantity(Math.max(1, Math.min(maxQuantity, Math.floor(next))));
                }}
                inputProps={{ min: 1, max: maxQuantity }}
                fullWidth
              />
            </Stack>
          )}

          {mode === "list" && (
            <Stack spacing={2}>
              <TextField
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) return;
                  setQuantity(Math.max(1, Math.min(maxQuantity, Math.floor(next))));
                }}
                inputProps={{ min: 1, max: maxQuantity }}
                fullWidth
              />
              <TextField
                label="Price Per Skin (USD)"
                type="number"
                value={priceUsd}
                onChange={(event) => setPriceUsd(event.target.value)}
                inputProps={{ min: 0.001, step: 0.001 }}
                fullWidth
              />
            </Stack>
          )}

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <TransactionProgressPanel txProgress={txProgress} />
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        {mode !== "buy" && (
          <Button onClick={handleSubmitNonBuy} variant="contained" disabled={disableSubmit}>
            {title}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
