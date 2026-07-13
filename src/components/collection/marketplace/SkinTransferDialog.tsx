"use client";

import MarketAssetSummary from "@/components/collection/marketplace/MarketAssetSummary";
import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import { useMarketplaceTransaction } from "@/hooks/collection/useMarketplaceTransaction";
import { buildSkinTransferPayloadAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { broadcastTransferSkins } from "@/lib/frontend/purchase/splBroadcast";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
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

interface SkinTransferDialogProps {
  open: boolean;
  account: string;
  item: MarketplaceAssetItem;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

/** Skins are quantity-based: transfer N copies via sm_transfer_skins. */
export default function SkinTransferDialog({
  open,
  account,
  item,
  onClose,
  onCompleted,
}: Readonly<SkinTransferDialogProps>) {
  const { busy, txProgress, error: submitError, run } = useMarketplaceTransaction(onCompleted);

  // The host unmounts this dialog when closed, so state resets on each open.
  const [recipient, setRecipient] = useState("");
  const [quantity, setQuantity] = useState(1);

  const maxQuantity = Math.max(1, item.numOwned);

  async function handleTransfer() {
    await run({
      label: "Transfer",
      message: `Sending ${quantity} skin${quantity === 1 ? "" : "s"} to ${recipient}...`,
      execute: async () => {
        const { payload } = await buildSkinTransferPayloadAction({
          account,
          detailId: item.detailId,
          recipient,
          quantity,
        });
        return broadcastTransferSkins(account, payload);
      },
    });
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Transfer Skin</DialogTitle>
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
