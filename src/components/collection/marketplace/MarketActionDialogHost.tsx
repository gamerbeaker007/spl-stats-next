"use client";

import BuyAssetDialog from "@/components/collection/marketplace/BuyAssetDialog";
import InstanceListDialog from "@/components/collection/marketplace/InstanceListDialog";
import InstanceTransferDialog from "@/components/collection/marketplace/InstanceTransferDialog";
import QuantityTransferDialog from "@/components/collection/marketplace/QuantityTransferDialog";
import QuantityListDialog from "@/components/collection/marketplace/QuantityListDialog";
import SkinTransferDialog from "@/components/collection/marketplace/SkinTransferDialog";
import { MARKETPLACE_ASSET_MODEL } from "@/lib/shared/marketplace-asset-model";
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
 * Renders the correct action dialog for the active (asset, mode). Buy is shared.
 * List/transfer are routed by the asset's ownership model:
 *  - `"instance"` (music, titles, totems, stickers, deeds): per-uid dialogs.
 *  - `"skin"`: card-linked quantity dialogs.
 *  - `"quantity"` (packs, consumables, fragments, resources, land): quantity list
 *    dialog; transfer sends a quantity of the fungible token (`sm_token_transfer`).
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

  const model = MARKETPLACE_ASSET_MODEL[assetName];

  // Quantity / fungible tokens: list by symbol + quantity; transfer a quantity of
  // the token via sm_token_transfer.
  if (model === "quantity") {
    return state.mode === "list" ? (
      <QuantityListDialog
        open
        account={account}
        assetName={assetName}
        item={state.item}
        defaultListPriceUsd={state.defaultListPriceUsd}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    ) : (
      <QuantityTransferDialog
        open
        account={account}
        assetName={assetName}
        item={state.item}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }

  if (model === "skin") {
    return state.mode === "list" ? (
      <QuantityListDialog
        open
        account={account}
        assetName={assetName}
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

  // Instance / uid based (music, titles, totems, collector stickers, deeds).
  return state.mode === "list" ? (
    <InstanceListDialog
      open
      account={account}
      assetName={assetName}
      item={state.item}
      defaultListPriceUsd={state.defaultListPriceUsd}
      onClose={onClose}
      onCompleted={onCompleted}
    />
  ) : (
    <InstanceTransferDialog
      open
      account={account}
      assetName={assetName}
      item={state.item}
      onClose={onClose}
      onCompleted={onCompleted}
    />
  );
}
