"use client";

import MarketAssetSummary from "@/components/collection/marketplace/MarketAssetSummary";
import AssetCopyPicker from "@/components/collection/marketplace/AssetCopyPicker";
import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import { useMarketplaceTransaction } from "@/hooks/collection/useMarketplaceTransaction";
import { useOwnedAssetInstances } from "@/hooks/collection/useOwnedAssetInstances";
import {
  buildDelistAssetPayloadAction,
  buildInstanceListPayloadAction,
} from "@/lib/backend/actions/marketplace-assets-actions";
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
  Stack,
  TextField,
} from "@mui/material";
import { useState } from "react";

interface InstanceListDialogProps {
  open: boolean;
  account: string;
  assetName: MarketplaceAssetName;
  item: MarketplaceAssetItem;
  defaultListPriceUsd: number | null;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

/**
 * Instance-based list dialog: picks specific owned copies (uids) to sell. Used by
 * music and every other uid/instance-based asset type (packs, titles, …).
 */
export default function InstanceListDialog({
  open,
  account,
  assetName,
  item,
  defaultListPriceUsd,
  onClose,
  onCompleted,
}: Readonly<InstanceListDialogProps>) {
  const { instances, loading, error, refresh } = useOwnedAssetInstances(
    account,
    assetName,
    item.detailId,
    open
  );
  const { busy, txProgress, error: submitError, run } = useMarketplaceTransaction(onCompleted);

  // The host unmounts this dialog when closed, so state resets on each open.
  const [priceUsd, setPriceUsd] = useState(() => defaultListPriceUsd?.toFixed(3) ?? "1.000");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [delistingId, setDelistingId] = useState<number | null>(null);

  function toggleUid(uid: string) {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((entry) => entry !== uid) : [...prev, uid]
    );
  }

  async function handleList() {
    await run({
      label: "List",
      message: `Listing ${selectedUids.length} item${selectedUids.length === 1 ? "" : "s"} for ${priceUsd} USD...`,
      execute: async () => {
        const { payload } = await buildInstanceListPayloadAction({
          account,
          assetName,
          itemUids: selectedUids,
          priceUsd: Number(priceUsd),
        });
        return broadcastMarketplaceList(account, payload);
      },
      onVerified: () => {
        setSelectedUids([]);
        return refresh();
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
      onVerified: refresh,
    });
    setDelistingId(null);
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>List Items</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <MarketAssetSummary item={item} />

          <TextField
            label="Price Per Item (USD)"
            type="number"
            value={priceUsd}
            onChange={(event) => setPriceUsd(event.target.value)}
            inputProps={{ min: 0.001, step: 0.001 }}
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}

          <AssetCopyPicker
            instances={instances}
            loading={loading}
            selectedUids={selectedUids}
            onToggle={toggleUid}
            showDelist
            onDelist={handleDelist}
            delistingId={delistingId}
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
          onClick={handleList}
          variant="contained"
          disabled={busy || selectedUids.length === 0 || Number(priceUsd) <= 0}
        >
          {selectedUids.length > 0 ? `List ${selectedUids.length} Selected` : "List"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
