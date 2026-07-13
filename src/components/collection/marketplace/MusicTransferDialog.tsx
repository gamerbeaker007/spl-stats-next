"use client";

import MarketAssetSummary from "@/components/collection/marketplace/MarketAssetSummary";
import MusicCopyPicker from "@/components/collection/marketplace/MusicCopyPicker";
import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import { useMarketplaceTransaction } from "@/hooks/collection/useMarketplaceTransaction";
import { useOwnedAssetInstances } from "@/hooks/collection/useOwnedAssetInstances";
import { buildMusicTransferPayloadAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { broadcastTransferItems } from "@/lib/frontend/purchase/splBroadcast";
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

interface MusicTransferDialogProps {
  open: boolean;
  account: string;
  item: MarketplaceAssetItem;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

/** Music is instance-based: transfer picks specific owned copies (uids). */
export default function MusicTransferDialog({
  open,
  account,
  item,
  onClose,
  onCompleted,
}: Readonly<MusicTransferDialogProps>) {
  const { instances, loading, error, refresh } = useOwnedAssetInstances(
    account,
    "MUSIC",
    item.detailId,
    open
  );
  const { busy, txProgress, error: submitError, run } = useMarketplaceTransaction(onCompleted);

  // The host unmounts this dialog when closed, so state resets on each open.
  const [recipient, setRecipient] = useState("");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);

  function toggleUid(uid: string) {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((entry) => entry !== uid) : [...prev, uid]
    );
  }

  async function handleTransfer() {
    await run({
      label: "Transfer",
      message: `Sending ${selectedUids.length} item${selectedUids.length === 1 ? "" : "s"} to ${recipient}...`,
      execute: async () => {
        const { payload } = await buildMusicTransferPayloadAction({
          account,
          recipient,
          itemUids: selectedUids,
        });
        return broadcastTransferItems(account, payload);
      },
      onVerified: () => {
        setSelectedUids([]);
        return refresh();
      },
    });
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Transfer Music</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <MarketAssetSummary item={item} />

          <TextField
            label="Recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}

          <MusicCopyPicker
            instances={instances}
            loading={loading}
            selectedUids={selectedUids}
            onToggle={toggleUid}
            disabled={busy}
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
          disabled={busy || recipient.trim().length === 0 || selectedUids.length === 0}
        >
          {selectedUids.length > 0 ? `Transfer ${selectedUids.length} Selected` : "Transfer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
