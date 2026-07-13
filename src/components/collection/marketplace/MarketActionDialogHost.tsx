"use client";

import BuyAssetDialog from "@/components/collection/marketplace/BuyAssetDialog";
import MusicListDialog from "@/components/collection/marketplace/MusicListDialog";
import MusicTransferDialog from "@/components/collection/marketplace/MusicTransferDialog";
import SkinListDialog from "@/components/collection/marketplace/SkinListDialog";
import SkinTransferDialog from "@/components/collection/marketplace/SkinTransferDialog";
import type { MarketplaceAssetItem, MarketplaceAssetName } from "@/types/marketplace-assets";

export type MarketActionMode = "buy" | "transfer" | "list";

export interface MarketActionState {
  mode: MarketActionMode;
  item: MarketplaceAssetItem;
  defaultListPriceUsd: number | null;
}

interface MarketActionDialogHostProps {
  state: MarketActionState | null;
  assetName: MarketplaceAssetName;
  account: string;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}

/**
 * Renders the correct action dialog for the active (asset, mode). Buy is shared;
 * list/transfer are split because skins are quantity-based while music is
 * instance (uid) based.
 */
export default function MarketActionDialogHost({
  state,
  assetName,
  account,
  onClose,
  onCompleted,
}: Readonly<MarketActionDialogHostProps>) {
  if (!state) return null;

  if (state.mode === "buy") {
    return (
      <BuyAssetDialog
        open
        assetName={assetName}
        account={account}
        item={state.item}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }

  if (assetName === "SKINS") {
    return state.mode === "list" ? (
      <SkinListDialog
        open
        account={account}
        item={state.item}
        defaultListPriceUsd={state.defaultListPriceUsd}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    ) : (
      <SkinTransferDialog
        open
        account={account}
        item={state.item}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }

  // MUSIC (instance / uid based)
  return state.mode === "list" ? (
    <MusicListDialog
      open
      account={account}
      item={state.item}
      defaultListPriceUsd={state.defaultListPriceUsd}
      onClose={onClose}
      onCompleted={onCompleted}
    />
  ) : (
    <MusicTransferDialog
      open
      account={account}
      item={state.item}
      onClose={onClose}
      onCompleted={onCompleted}
    />
  );
}
