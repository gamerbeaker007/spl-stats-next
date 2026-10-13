"use client";

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
import { useCallback, useEffect, useState } from "react";

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
  const [data, setData] = useState<MarketplaceAssetsPageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const includeDetailedCollection = options.includeDetailedCollection ?? assetName === "SKINS";
  const includeOutbidStatuses = options.includeOutbidStatuses ?? false;

  const load = useCallback(
    async (active: () => boolean): Promise<MarketplaceAssetsPageData | null> => {
      setLoading(true);
      setError(null);

      try {
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
        const next: MarketplaceAssetsPageData = {
          ...marketplace,
          detailedCollection,
          publicSkinFilterCards: buildPublicSkinFilterCards(cardDetails, marketplace.groups),
        };
        if (active()) setData(next);
        return next;
      } catch (err) {
        if (active())
          setError(err instanceof Error ? err.message : "Failed to load marketplace data");
        return null;
      } finally {
        if (active()) setLoading(false);
      }
    },
    [account, assetName, includeDetailedCollection, includeOutbidStatuses, refreshVersion]
  );

  useEffect(() => {
    // Until the selection settles, `account` may still flip (`null` → stored account).
    if (!accountsReady) return;
    let active = true;
    load(() => active);

    return () => {
      active = false;
    };
  }, [account, accountsReady, load, refreshVersion]);

  return { data, loading: loading || !accountsReady, error };
}
