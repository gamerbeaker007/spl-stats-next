"use client";

import LandMarketControls from "@/components/collection/land-market/LandMarketControls";
import LandMarketFilterPanel from "@/components/collection/land-market/LandMarketFilterPanel";
import LandMarketGrid from "@/components/collection/land-market/LandMarketGrid";
import LandMarketTable from "@/components/collection/land-market/LandMarketTable";
import LandMarketToolbar from "@/components/collection/land-market/LandMarketToolbar";
import OwnRegionsToggle from "@/components/collection/land-market/OwnRegionsToggle";
import MarketplaceAccountBar from "@/components/collection/marketplace/MarketplaceAccountBar";
import { useLandCart } from "@/hooks/land-market/useLandCart";
import { useLandMarket } from "@/hooks/land-market/useLandMarket";
import { LAND_MARKET_PAGE_SIZES, useLandMarketView } from "@/hooks/land-market/useLandMarketView";
import { useOwnedLandRegions } from "@/hooks/land-market/useOwnedLandRegions";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { AssetWatchProvider, useAssetWatchContext } from "@/lib/frontend/context/AssetWatchContext";
import { useMarketplaceView } from "@/lib/frontend/context/MarketplaceViewContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { landMarketWatchId } from "@/lib/shared/land-market";
import {
  Alert,
  Box,
  Button,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  TablePagination,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

const NOW_TICK_MS = 60_000;

/**
 * Current time for the "Since" column, ticking every minute. Starts at 0 and is
 * read in an effect: reading the clock during render is flagged by Next's
 * prerender check, and no listing renders before the client fetch anyway.
 */
function useNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, NOW_TICK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  return now;
}

/**
 * Land Market: every market-listed land deed, filtered / sorted / paginated
 * client side, in a table or an artwork-first grid, buyable through the shared
 * purchase cart.
 */
export default function LandMarketPageClient() {
  return (
    <AssetWatchProvider assetName="DEEDS">
      <LandMarketPageContent />
    </AssetWatchProvider>
  );
}

function LandMarketPageContent() {
  const { selectedAccount } = useAccounts();
  const account = selectedAccount ? selectedAccount : null;
  const { viewMode } = useMarketplaceView();
  const { collectionRefreshVersion, purchasedMarketIds } = usePurchasePlan();

  const market = useLandMarket();
  const assetWatchContext = useAssetWatchContext();
  const owned = useOwnedLandRegions(account, collectionRefreshVersion);
  const cart = useLandCart(account);
  const now = useNow();

  const [showOwnRegions, setShowOwnRegions] = useState(false);
  const [watchedOnly, setWatchedOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(true);
  const ownRegionsActive = showOwnRegions && account !== null;
  // Never fall back to unfiltered results while the toggle is on: until the
  // regions are known the results area shows a loading or error state instead.
  const ownRegionsReady = !ownRegionsActive || (owned.loaded && !owned.error);

  const filteredListings = useMemo(
    () =>
      watchedOnly
        ? market.listings.filter(
            (listing) => assetWatchContext?.watches[landMarketWatchId(listing.deedUid)]
          )
        : market.listings,
    [assetWatchContext?.watches, market.listings, watchedOnly]
  );

  const view = useLandMarketView(filteredListings, {
    regionUids: ownRegionsActive ? owned.regionUids : null,
    hiddenMarketIds: purchasedMarketIds,
  });
  const { setPage } = view;

  // A confirmed purchase (here or elsewhere in the cart) — pull fresh listings.
  const { refresh } = market;
  const lastRefreshVersion = useRef(collectionRefreshVersion);
  useEffect(() => {
    if (collectionRefreshVersion === lastRefreshVersion.current) return;
    lastRefreshVersion.current = collectionRefreshVersion;
    void refresh();
  }, [collectionRefreshVersion, refresh]);

  const resultsTopRef = useRef<HTMLDivElement>(null);
  function changePage(next: number) {
    setPage(next);
    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderResults() {
    if (market.loading && market.listings.length === 0) {
      return (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 290px), 1fr))",
            gap: 2,
          }}
          aria-busy="true"
          aria-label="Loading land listings"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} variant="rounded" height={300} />
          ))}
        </Box>
      );
    }

    if (market.error && market.listings.length === 0) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void market.refresh()}>
              Retry
            </Button>
          }
        >
          Could not load the land marketplace: {market.error}
        </Alert>
      );
    }

    if (!ownRegionsReady) {
      if (owned.error) {
        return (
          <Alert severity="warning">
            Show Own Regions is on, but the owned land for {account} could not be loaded. Retry
            above or turn the toggle off to see all listings.
          </Alert>
        );
      }
      return <Skeleton variant="rounded" height={240} aria-label="Loading owned regions" />;
    }

    if (ownRegionsActive && owned.regionCount === 0) {
      return (
        <Alert severity="info">
          {account} does not own any land yet, so there are no listings in owned regions. Turn off
          Show Own Regions to browse the full market.
        </Alert>
      );
    }

    if (market.listings.length === 0) {
      return <Alert severity="info">There are no land deeds listed on the market right now.</Alert>;
    }

    if (view.total === 0) {
      return (
        <Alert
          severity="info"
          action={
            view.activeFilterCount > 0 ? (
              <Button color="inherit" size="small" onClick={view.resetFilter}>
                Clear filters
              </Button>
            ) : undefined
          }
        >
          No listings match the current filters
          {ownRegionsActive ? " in the regions this account owns" : ""}.
        </Alert>
      );
    }

    return viewMode === "table" ? (
      <LandMarketTable
        listings={view.pageRows}
        sort={view.sort}
        onSortChange={view.toggleSort}
        getCartState={cart.getState}
        onToggleCart={cart.toggle}
        now={now}
      />
    ) : (
      <LandMarketGrid
        listings={view.pageRows}
        getCartState={cart.getState}
        onToggleCart={cart.toggle}
        decPriceUsd={cart.decPriceUsd}
        now={now}
      />
    );
  }

  const showPagination = ownRegionsReady && view.total > 0;
  const clearFilters = () => {
    view.resetFilter();
    setWatchedOnly(false);
  };

  return (
    <>
      <Stack spacing={2}>
        <MarketplaceAccountBar />

        <Stack direction="row" spacing={1}>
          <OwnRegionsToggle
            account={account}
            enabled={showOwnRegions}
            onChange={(enabled) => {
              setShowOwnRegions(enabled);
              setPage(0);
            }}
            regionCount={owned.regionCount}
            loaded={owned.loaded}
            loading={owned.loading}
            error={owned.error}
            onRetry={owned.retry}
          />

          <LandMarketControls
            showWatchedOnly={assetWatchContext !== null}
            watchedOnly={watchedOnly}
            onWatchedOnlyChange={(enabled) => {
              setWatchedOnly(enabled);
              setPage(0);
            }}
            sort={view.sort}
            onSortChange={view.toggleSort}
            viewMode={viewMode}
          />
        </Stack>
        <Box ref={resultsTopRef} sx={{ scrollMarginTop: 140 }}>
          <LandMarketToolbar
            total={market.listings.length}
            matching={ownRegionsReady ? view.total : 0}
            activeFilterCount={view.activeFilterCount + Number(watchedOnly)}
            onClearFilters={clearFilters}
            refreshing={market.refreshing}
            fetchedAt={market.fetchedAt}
            onRefresh={() => void market.refresh()}
          />
        </Box>

        {/* Subtle background-refresh indicator; the current listings stay visible. */}
        <Box sx={{ height: 2 }}>{market.refreshing && <LinearProgress sx={{ height: 2 }} />}</Box>

        {market.error && market.listings.length > 0 && (
          <Alert severity="warning">
            Refreshing failed ({market.error}). Showing the last loaded listings.
          </Alert>
        )}

        {renderResults()}

        {showPagination && (
          <Paper variant="outlined">
            <TablePagination
              component="div"
              count={view.total}
              page={view.page}
              onPageChange={(_event, next) => changePage(next)}
              rowsPerPage={view.pageSize}
              rowsPerPageOptions={[...LAND_MARKET_PAGE_SIZES]}
              onRowsPerPageChange={(event) => view.setPageSize(Number(event.target.value))}
              labelRowsPerPage="Per page"
              showFirstButton
              showLastButton
            />
          </Paper>
        )}
      </Stack>

      <LandMarketFilterPanel
        filter={view.filter}
        setFilter={view.setFilter}
        resetFilter={view.resetFilter}
        open={filterOpen}
        onToggle={() => setFilterOpen((open) => !open)}
        activeCount={view.activeFilterCount}
      />
    </>
  );
}
