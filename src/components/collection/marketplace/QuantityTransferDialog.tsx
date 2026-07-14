"use client";

import MarketAssetSummary from "@/components/collection/marketplace/MarketAssetSummary";
import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import { useMarketplaceTransaction } from "@/hooks/collection/useMarketplaceTransaction";
import { buildTokenTransferPayloadAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { broadcastTokenTransfer } from "@/lib/frontend/purchase/splBroadcast";
import type { MarketplaceAssetItem, MarketplaceAssetName } from "@/types/marketplace-assets";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useState } from "react";

interface QuantityTransferDialogProps {
  open: boolean;
  account: string;
  assetName: MarketplaceAssetName;
  item: MarketplaceAssetItem;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

/**
 * Fungible/quantity transfer dialog: send N of a fungible token (packs,
 * consumables, totem fragments, land resources) to another player via
 * `sm_token_transfer`. The asset's detailId is the token symbol.
 */
export default function QuantityTransferDialog({
  open,
  account,
  assetName,
  item,
  onClose,
  onCompleted,
}: Readonly<QuantityTransferDialogProps>) {
  const { busy, txProgress, error: submitError, run } = useMarketplaceTransaction(onCompleted);

  // The host unmounts this dialog when closed, so state resets on each open.
  const [recipient, setRecipient] = useState("");
  const [quantity, setQuantity] = useState(1);

  const maxQuantity = Math.max(1, item.numOwned);

  async function handleTransfer() {
    await run({
      label: "Transfer",
      message: `Sending ${quantity} item${quantity === 1 ? "" : "s"} to ${recipient}...`,
      execute: async () => {
        const { payload } = await buildTokenTransferPayloadAction({
          account,
          assetName,
          detailId: item.detailId,
          recipient,
          quantity,
        });
        return broadcastTokenTransfer(account, payload);
      },
    });
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Transfer Items</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <MarketAssetSummary item={item} />

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

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <TransactionProgressPanel txProgress={txProgress} />
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button
          onClick={handleTransfer}
          variant="contained"
          disabled={busy || item.numOwned < 1 || recipient.trim().length === 0}
        >
          Transfer {quantity}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
