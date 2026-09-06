"use client";

import { getMarketplaceAssetsPageDataAction } from "@/lib/backend/actions/marketplace-assets-actions";
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
  playerListings: MarketplacePlayerListing[];
  outbidStatuses: OutbidStatus[];
}

export interface MarketplaceAssetsPageDataLoadOptions {
  includeDetailedCollection?: boolean;
  includeOutbidStatuses?: boolean;
}

export function useMarketplaceAssetsPageData(
  account: string | null,
  assetName: MarketplaceAssetName,
  refreshVersion = 0,
  options: MarketplaceAssetsPageDataLoadOptions = {}
) {
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
        const next = await getMarketplaceAssetsPageDataAction(account ?? null, assetName, {
          includeDetailedCollection,
          includeOutbidStatuses,
        });
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
    [account, assetName, includeDetailedCollection, includeOutbidStatuses]
  );

  useEffect(() => {
    let active = true;
    load(() => active);

    return () => {
      active = false;
    };
  }, [account, load, refreshVersion]);

  const refresh = useCallback(() => load(() => true), [load]);

  return { data, loading, error, refresh };
}
