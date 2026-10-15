"use client";

import { useAsyncData } from "@/hooks/useAsyncData";
import { loadCardDetails, loadDetailedCollection } from "@/lib/frontend/collection-data";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { loadMarketplacePageData } from "@/lib/frontend/marketplace-data";
import type { FilterableCard } from "@/lib/shared/card-filter-utils";
import { buildPublicSkinFilterCards } from "@/lib/shared/skin-groups";
import type { DetailedPlayerCardCollection } from "@/types/card";
import type {
  MarketplaceAssetGroup,
  MarketplaceAssetItem,
  MarketplaceAssetName,
  MarketplacePlayerListing,
  OutbidStatus,
} from "@/types/marketplace-assets";

export interface MarketplaceAssetsPageData {
  account: string | null;
  assetName: MarketplaceAssetName;
  items: MarketplaceAssetItem[];
  groups: MarketplaceAssetGroup[];
  detailedCollection: DetailedPlayerCardCollection;
  publicSkinFilterCards: Record<number, FilterableCard[]>;
  playerListings: MarketplacePlayerListing[];
  outbidStatuses: OutbidStatus[];
}

export interface MarketplaceAssetsPageDataLoadOptions {
  /** Also load the account's card collection + card filter metadata (skins page). */
  includeDetailedCollection?: boolean;
  includeOutbidStatuses?: boolean;
}

export function useMarketplaceAssetsPageData(
  account: string | null,
  assetName: MarketplaceAssetName,
  refreshVersion = 0,
  options: MarketplaceAssetsPageDataLoadOptions = {}
) {
  const { accountsReady } = useAccounts();
  const includeDetailedCollection = options.includeDetailedCollection ?? assetName === "SKINS";
  const includeOutbidStatuses = options.includeOutbidStatuses ?? false;

  // Until the selection settles, `account` may still flip (`null` → stored account).
  const key = accountsReady
    ? [account, assetName, refreshVersion, includeDetailedCollection, includeOutbidStatuses].join(
        ":"
      )
    : null;

  const { data, loading, error } = useAsyncData(
    key,
    async (): Promise<MarketplaceAssetsPageData> => {
      // Marketplace holdings and the collection are read from SPL in the browser;
      // card details come from the server cache, memoized per tab.
      const [marketplace, detailedCollection, cardDetails] = await Promise.all([
        loadMarketplacePageData(account, assetName, includeOutbidStatuses, refreshVersion),
        account && includeDetailedCollection
          ? loadDetailedCollection(account, refreshVersion)
          : Promise.resolve<DetailedPlayerCardCollection>({}),
        assetName === "SKINS" && includeDetailedCollection
          ? loadCardDetails()
          : Promise.resolve([]),
      ]);
      return {
        ...marketplace,
        detailedCollection,
        publicSkinFilterCards: buildPublicSkinFilterCards(cardDetails, marketplace.groups),
      };
    },
    { errorMessage: "Failed to load marketplace data" }
  );

  return { data: data ?? null, loading: loading || !accountsReady, error };
}
