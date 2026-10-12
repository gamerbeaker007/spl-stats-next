"use client";

import {
  DEFAULT_LAND_MARKET_FILTER,
  countActiveLandMarketFilters,
  matchesLandMarketFilter,
  sortLandMarketListings,
} from "@/lib/shared/land-market";
import type {
  LandMarketFilter,
  LandMarketListing,
  LandMarketSort,
  LandMarketSortField,
  SortDirection,
} from "@/types/land/landMarket";
import { landCartMarketId } from "@/types/purchase/purchase-plan";
import { useCallback, useMemo, useState } from "react";

export const LAND_MARKET_PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_SORT: LandMarketSort = { field: "price", direction: "asc" };

/** First click on a column sorts in its most useful direction. */
const DEFAULT_DIRECTION: Record<LandMarketSortField, SortDirection> = {
  price: "asc",
  location: "asc",
  since: "asc",
  rarity: "desc",
};

interface LandMarketViewOptions {
  /** Restrict to these `region_uid`s (Show Own Regions), or `null` for no restriction. */
  regionUids: ReadonlySet<string> | null;
  /** Cart keys of listings bought this session — hidden until SPL catches up. */
  hiddenMarketIds: ReadonlySet<string>;
}

/**
 * Client-side filter → sort → paginate pipeline over the cached listings.
 * Each stage is memoized on its own inputs, so paging never re-filters and
 * filtering never refetches. Any filter change returns to the first page.
 */
export function useLandMarketView(listings: LandMarketListing[], options: LandMarketViewOptions) {
  const { regionUids, hiddenMarketIds } = options;
  const [filter, setFilterState] = useState<LandMarketFilter>(DEFAULT_LAND_MARKET_FILTER);
  const [sort, setSort] = useState<LandMarketSort>(DEFAULT_SORT);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);

  const setFilter = useCallback((updates: Partial<LandMarketFilter>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
    setPage(0);
  }, []);

  const resetFilter = useCallback(() => {
    setFilterState(DEFAULT_LAND_MARKET_FILTER);
    setPage(0);
  }, []);

  const toggleSort = useCallback((field: LandMarketSortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { field, direction: DEFAULT_DIRECTION[field] }
    );
    setPage(0);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(0);
  }, []);

  const filtered = useMemo(
    () =>
      listings.filter(
        (listing) =>
          !hiddenMarketIds.has(landCartMarketId(listing.listingItemId)) &&
          (regionUids === null || regionUids.has(listing.regionUid)) &&
          matchesLandMarketFilter(listing, filter)
      ),
    [filter, hiddenMarketIds, listings, regionUids]
  );

  const sorted = useMemo(() => sortLandMarketListings(filtered, sort), [filtered, sort]);

  // Clamp rather than reset: a background refresh keeps the current page when it still exists.
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => sorted.slice(safePage * pageSize, (safePage + 1) * pageSize),
    [pageSize, safePage, sorted]
  );

  const activeFilterCount = useMemo(() => countActiveLandMarketFilters(filter), [filter]);

  return {
    filter,
    setFilter,
    resetFilter,
    activeFilterCount,
    sort,
    toggleSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    total: sorted.length,
    pageRows,
  };
}
