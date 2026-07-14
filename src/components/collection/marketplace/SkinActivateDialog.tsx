"use client";

import MarketAssetSummary from "@/components/collection/marketplace/MarketAssetSummary";
import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import { useMarketplaceTransaction } from "@/hooks/collection/useMarketplaceTransaction";
import { useOwnedListings } from "@/hooks/collection/useOwnedListings";
import { buildActivateSkinPayloadAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { broadcastSetSkin } from "@/lib/frontend/purchase/splBroadcast";
import { isSkinActive } from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from "@mui/material";

interface SkinActivateDialogProps {
  open: boolean;
  account: string;
  item: MarketplaceAssetItem;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

export default function SkinActivateDialog({
  open,
  account,
  item,
  onClose,
  onCompleted,
}: Readonly<SkinActivateDialogProps>) {
  const { busy, txProgress, error: submitError, run } = useMarketplaceTransaction(onCompleted);
  const { listings, error, refresh } = useOwnedListings(account, "SKINS", item.detailId, open);

  console.log("SkinActivateDialog", item.displayName, {
    "item.assetName === 'SKINS'": item.assetName === "SKINS",
    "item.active": item.active,
    "isSkinActive(item)": isSkinActive(item),
    "item.numOwned": item.numOwned,
    "item.numListed": item.numListed,
    listings,
  });

  const active = isSkinActive(item);
  const blockedByListing = item.numListed > 0;
  const canActivate = item.numOwned > 0 && !active && !blockedByListing;

  async function handleActivate() {
    await run({
      label: "Activate",
      message: `Activating ${item.displayName}...`,
      execute: async () => {
        const { payload } = await buildActivateSkinPayloadAction({
          account,
          detailId: item.detailId,
        });
        return broadcastSetSkin(account, payload);
      },
    });
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Activate Skin</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <MarketAssetSummary item={item} />

          {active && <Alert severity="info">This skin is already active.</Alert>}

          {blockedByListing && (
            <Alert severity="warning">
              This skin has listed copies and cannot be activated until delisted.
            </Alert>
          )}

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <TransactionProgressPanel txProgress={txProgress} />
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button onClick={handleActivate} variant="contained" disabled={busy || !canActivate}>
          Activate
        </Button>
      </DialogActions>
    </Dialog>
  );
}
