"use client";

import MarketAssetSummary from "@/components/collection/marketplace/MarketAssetSummary";
import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import { useMarketplaceTransaction } from "@/hooks/collection/useMarketplaceTransaction";
import { useOwnedSkinListings } from "@/hooks/collection/useOwnedSkinListings";
import {
  buildDelistAssetPayloadAction,
  buildSkinListPayloadAction,
} from "@/lib/backend/actions/marketplace-assets-actions";
import {
  broadcastMarketplaceCancel,
  broadcastMarketplaceList,
} from "@/lib/frontend/purchase/splBroadcast";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
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
import { useState } from "react";

interface SkinListDialogProps {
  open: boolean;
  account: string;
  item: MarketplaceAssetItem;
  defaultListPriceUsd: number | null;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

/** Skins are quantity-based: list N copies at a price; cancel your active listings. */
export default function SkinListDialog({
  open,
  account,
  item,
  defaultListPriceUsd,
  onClose,
  onCompleted,
}: Readonly<SkinListDialogProps>) {
  const { listings, error, refresh } = useOwnedSkinListings(account, item.detailId, open);
  const { busy, txProgress, error: submitError, run } = useMarketplaceTransaction(onCompleted);

  // The host unmounts this dialog when closed, so state resets on each open.
  const [quantity, setQuantity] = useState(1);
  const [priceUsd, setPriceUsd] = useState(() => defaultListPriceUsd?.toFixed(3) ?? "1.000");
  const [delistingId, setDelistingId] = useState<number | null>(null);

  const maxQuantity = Math.max(1, item.numOwned);

  async function handleList() {
    await run({
      label: "List",
      message: `Listing ${quantity} skin${quantity === 1 ? "" : "s"} for ${priceUsd} USD...`,
      execute: async () => {
        const { payload } = await buildSkinListPayloadAction({
          account,
          detailId: item.detailId,
          quantity,
          priceUsd: Number(priceUsd),
        });
        return broadcastMarketplaceList(account, payload);
      },
      onVerified: refresh,
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
          assetName: "SKINS",
          detailId: item.detailId,
          listingItemIds: [listingItemId],
        });
        return broadcastMarketplaceCancel(account, payload);
      },
      onVerified: refresh,
    });
    setDelistingId(null);
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>List Skin</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <MarketAssetSummary item={item} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button
          onClick={handleList}
          variant="contained"
          disabled={busy || item.numOwned < 1 || Number(priceUsd) <= 0}
        >
          List {quantity}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
