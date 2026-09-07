import type { RunTxOptions } from "@/hooks/collection/useMarketplaceTransaction";
import { buildActivateSkinPayloadAction } from "@/lib/backend/actions/marketplace-assets-actions";
import { broadcastSetSkin } from "@/lib/frontend/purchase/splBroadcast";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";

/**
 * The "activate this skin" transaction, as a `useMarketplaceTransaction` run.
 * Shared by the activate dialog and the activate button on the buy/list dialogs,
 * so all three broadcast the identical payload and report progress the same way.
 */
export function buildSkinActivationTx(account: string, item: MarketplaceAssetItem): RunTxOptions {
  return {
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
  };
}
