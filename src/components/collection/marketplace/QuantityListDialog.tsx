"use client";

import MarketAssetSummary from "@/components/collection/marketplace/MarketAssetSummary";
import SkinActivateButton from "@/components/collection/marketplace/SkinActivateButton";
import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import { useMarketplaceTransaction } from "@/hooks/collection/useMarketplaceTransaction";
import { useOwnedListings } from "@/hooks/collection/useOwnedListings";
import {
  buildDelistAssetPayloadAction,
  buildQuantityListPayloadAction,
} from "@/lib/backend/actions/marketplace-assets-actions";
import {
  getActualOwnedQuantity,
  getAvailableToListQuantity,
  isSkinActive,
} from "@/lib/shared/marketplace-assets";
import {
  broadcastMarketplaceCancel,
  broadcastMarketplaceList,
} from "@/lib/frontend/purchase/splBroadcast";
import type { MarketplaceAssetItem, MarketplaceAssetName } from "@/types/marketplace-assets";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";

/** How long to keep re-checking that the owned quantity caught up with a listing. */
const LISTING_SYNC_POLL_MS = 3000;
const LISTING_SYNC_MAX_POLLS = 8;

interface QuantityListDialogProps {
  open: boolean;
  account: string;
  assetName: MarketplaceAssetName;
  item: MarketplaceAssetItem;
  defaultListPriceUsd: number | null;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

/**
 * Quantity-based list dialog: list N copies at a price; cancel active listings.
 * Used by skins and every fungible/quantity asset (packs, consumables, …).
 */
export default function QuantityListDialog({
  open,
  account,
  assetName,
  item,
  defaultListPriceUsd,
  onClose,
  onCompleted,
}: Readonly<QuantityListDialogProps>) {
  const { listings, error, refresh } = useOwnedListings(account, assetName, item.detailId, open);
  const { busy, txProgress, error: submitError, run } = useMarketplaceTransaction(onCompleted);

  // The host unmounts this dialog when closed, so state resets on each open.
  const [quantity, setQuantity] = useState(1);
  const [priceUsd, setPriceUsd] = useState(() => defaultListPriceUsd?.toFixed(3) ?? "1.000");
  const [delistingId, setDelistingId] = useState<number | null>(null);
  /**
   * Owned total from before the listings we just broadcast, or `null` when no
   * listing is in flight.
   *
   * Listing never changes how many copies you own, so a *rise* in the owned total
   * means the two sources disagree: `player/all_listings` already reports the new
   * listing while `market/landing` still counts those copies as held, so they are
   * counted twice. In that window "owned" doubles, "available to list" is too
   * high, and a fully listed skin looks activatable — so every action here waits
   * for the total to settle back.
   */
  const [ownedBeforeListing, setOwnedBeforeListing] = useState<number | null>(null);

  const awaitingListingSync =
    ownedBeforeListing !== null && getActualOwnedQuantity(item) > ownedBeforeListing;
  const listableQuantity = getAvailableToListQuantity(item);
  const maxQuantity = Math.max(1, listableQuantity);
  const activeSkin = isSkinActive(item);

  const effectiveQuantity = Math.min(Math.max(1, quantity), maxQuantity);

  // `onCompleted` is a fresh closure on every parent render; keep it in a ref so
  // the poll below is driven only by the sync state.
  const onCompletedRef = useRef(onCompleted);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
  });

  // Re-pull the page data until the owned total settles, then the guard lifts by
  // itself. Bounded, so a backend that never catches up unblocks the dialog
  // instead of freezing it.
  useEffect(() => {
    if (!awaitingListingSync) return;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (attempts > LISTING_SYNC_MAX_POLLS) {
        setOwnedBeforeListing(null);
        return;
      }
      void onCompletedRef.current();
    }, LISTING_SYNC_POLL_MS);

    return () => clearInterval(timer);
  }, [awaitingListingSync]);

  async function handleList() {
    const ownedBefore = getActualOwnedQuantity(item);
    await run({
      label: "List",
      message: `Listing ${effectiveQuantity} item${effectiveQuantity === 1 ? "" : "s"} for ${priceUsd} USD...`,
      execute: async () => {
        const { payload } = await buildQuantityListPayloadAction({
          account,
          assetName,
          detailId: item.detailId,
          quantity: effectiveQuantity,
          priceUsd: Number(priceUsd),
        });
        return broadcastMarketplaceList(account, payload);
      },
      onVerified: async () => {
        setOwnedBeforeListing(ownedBefore);
        await refresh();
      },
    });
  }

  async function handleDelist(listingItemId: number) {
    setDelistingId(listingItemId);
    await run({
      label: "Delist",
      message: "Cancelling listing...",
      execute: async () => {
        const { payload } = await buildDelistAssetPayloadAction({
          account,
          assetName,
          detailId: item.detailId,
          listingItemIds: [listingItemId],
        });
        return broadcastMarketplaceCancel(account, payload);
      },
      onVerified: async () => {
        // A cancel only ever lowers the listed count, and a stale (still listed)
        // item keeps Activate disabled on its own — so drop the guard.
        setOwnedBeforeListing(null);
        await refresh();
      },
    });
    setDelistingId(null);
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>List Items</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <MarketAssetSummary item={item} />

          {item.assetName === "SKINS" && activeSkin && (
            <Alert severity="warning">
              One active copy is reserved and cannot be listed.
              {listableQuantity > 0
                ? ` You can still list up to ${listableQuantity} other copies.`
                : ""}
            </Alert>
          )}

          {awaitingListingSync ? (
            <Alert severity="info">
              Your listing is confirmed on chain. Waiting for the owned quantity to catch up — the
              actions below unlock as soon as the numbers settle.
            </Alert>
          ) : (
            listableQuantity < 1 && (
              <Alert severity="info">No quantity is currently available to list.</Alert>
            )
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Quantity"
              type="number"
              value={effectiveQuantity}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                setQuantity(Math.max(1, Math.min(maxQuantity, Math.floor(next))));
              }}
              inputProps={{ min: 1, max: maxQuantity }}
              fullWidth
            />
            <TextField
              label="Price Per Item (USD)"
              type="number"
              value={priceUsd}
              onChange={(event) => setPriceUsd(event.target.value)}
              inputProps={{ min: 0.001, step: 0.001 }}
              fullWidth
            />
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {listings.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2">Your active listings</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Qty</TableCell>
                    <TableCell>Price (USD)</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listings.map((listing) => (
                    <TableRow key={listing.listingItemId}>
                      <TableCell>{listing.quantityRemaining}</TableCell>
                      <TableCell>{listing.price.toFixed(3)}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="warning"
                          disabled={busy || delistingId === listing.listingItemId}
                          onClick={() => handleDelist(listing.listingItemId)}
                        >
                          {delistingId === listing.listingItemId ? "Delisting..." : "Delist"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <TransactionProgressPanel txProgress={txProgress} />
        <SkinActivateButton
          account={account}
          item={item}
          run={run}
          busy={busy}
          disabled={awaitingListingSync}
          disabledReason="Waiting for the owned quantity to catch up with your listing..."
        />
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button
          onClick={handleList}
          variant="contained"
          disabled={busy || awaitingListingSync || listableQuantity < 1 || Number(priceUsd) <= 0}
        >
          List {effectiveQuantity}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
