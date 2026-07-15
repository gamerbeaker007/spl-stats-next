"use client";

import MarketAssetSummary from "@/components/collection/marketplace/MarketAssetSummary";
import TransactionProgressPanel from "@/components/shared/TransactionProgressPanel";
import { useMarketplaceTransaction } from "@/hooks/collection/useMarketplaceTransaction";
import { buildActivateSkinPayloadAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { broadcastSetSkin } from "@/lib/frontend/purchase/splBroadcast";
import { getActualOwnedQuantity, isSkinActive } from "@/lib/shared/marketplace-assets";
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

  const active = isSkinActive(item);
  const actualOwned = getActualOwnedQuantity(item);
  const canActivate = actualOwned > 0 && !active;

  async function handleActivate() {
    await run({
      label: "Activate",
      message: `Activating ${item.displayName}...`,
      execute: async () => {
        const { payload } = await buildActivateSkinPayloadAction({
          account,
          detailId: item.detailId,
          cardDetailId: item.cardDetailId,
          skinName: item.activationSkinName ?? (item.setName || item.displayName),
          baseSkin: item.baseSkin,
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

          {!active && actualOwned < 1 && (
            <Alert severity="warning">You do not own this skin.</Alert>
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
