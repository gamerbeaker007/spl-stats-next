"use client";

import MarketActionDialogHost, {
  type MarketActionMode,
  type MarketActionState,
} from "@/components/collection/marketplace/MarketActionDialogHost";
import MarketAssetCard from "@/components/collection/marketplace/MarketAssetCard";
import MarketFilterBar from "@/components/collection/marketplace/MarketFilterBar";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import { LoadingSpinnerOverlay } from "@/components/ui/LoadingSpinnerOverlay";
import { useMarketplaceAssetsPageData } from "@/hooks/collection/useMarketplaceAssetsPageData";
import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import {
  applyMarketAssetFilters,
  DEFAULT_MARKET_ASSET_FILTER,
  getLowestUsdPrice,
  type MarketAssetFilter,
} from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import { Alert, Box, FormControlLabel, Stack, Switch, TextField } from "@mui/material";
import { useMemo, useState } from "react";

export default function MusicPageClient() {
  const { collectionRefreshVersion, notifyBalancesRefresh, notifyCollectionRefresh } =
    usePurchasePlan();
  const {
    monitoredAccounts,
    selectedAccount,
    setSelectedAccount,
    accountOptions,
    addLocalAccount,
    removeLocalAccount,
  } = useAccounts();

  const [addAccountInput, setAddAccountInput] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MarketAssetFilter>(DEFAULT_MARKET_ASSET_FILTER);
  const [dialogState, setDialogState] = useState<MarketActionState | null>(null);

  const { data, loading, error } = useMarketplaceAssetsPageData(
    selectedAccount,
    "MUSIC",
    collectionRefreshVersion
  );

  const items = useMemo<MarketplaceAssetItem[]>(() => {
    const query = search.trim().toLowerCase();
    const base = (data?.items ?? []).filter((item) => {
      if (ownedOnly && item.numOwned < 1) return false;
      if (query && !item.displayName.toLowerCase().includes(query)) return false;
      return true;
    });
    return applyMarketAssetFilters(base, filter);
  }, [data?.items, ownedOnly, search, filter]);

  const handleAction = (mode: MarketActionMode, item: MarketplaceAssetItem) => {
    setDialogState({ mode, item, defaultListPriceUsd: getLowestUsdPrice(item.prices) });
  };

  const handleCompleted = async () => {
    // Invalidate the server caches first so the client re-fetch gets fresh data.
    await revalidateTagsAction([
      { type: "marketplace", usernames: [selectedAccount] },
      { type: "balances", usernames: [selectedAccount] },
    ]);
    notifyBalancesRefresh();
    notifyCollectionRefresh();
  };

  return (
    <Box display="flex" flex={1}>
      <Box flex={1}>
        <Stack spacing={2.5}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: "background.paper",
              border: 1,
              borderColor: "divider",
            }}
          >
            <Stack spacing={1.25}>
              <AccountSelectorBar
                accounts={accountOptions}
                selectedAccount={selectedAccount}
                onSelectedAccountChange={setSelectedAccount}
                addAccountInput={addAccountInput}
                onAddAccountInputChange={setAddAccountInput}
                onAddAccount={() => {
                  addLocalAccount(addAccountInput);
                  setAddAccountInput("");
                }}
                onRemoveSelected={() => removeLocalAccount(selectedAccount)}
                removeDisabled={!selectedAccount || monitoredAccounts.includes(selectedAccount)}
                extraContent={
                  <TextField
                    size="small"
                    label="Search music"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    sx={{ minWidth: 220 }}
                  />
                }
              />

              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <FormControlLabel
                  control={
                    <Switch checked={ownedOnly} onChange={(_e, checked) => setOwnedOnly(checked)} />
                  }
                  label="Owned music only"
                />
                <MarketFilterBar filter={filter} onChange={setFilter} />
              </Stack>
            </Stack>
          </Box>

          <LoadingSpinnerOverlay loading={loading} message="Loading marketplace music..." />

          {!loading && error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && items.length === 0 && (
            <Alert severity="info">No music matches the selected filters.</Alert>
          )}

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {items.map((item) => (
              <MarketAssetCard key={item.detailId} item={item} onAction={handleAction} />
            ))}
          </Box>
        </Stack>
      </Box>

      <MarketActionDialogHost
        state={dialogState}
        assetName="MUSIC"
        account={selectedAccount}
        onClose={() => setDialogState(null)}
        onCompleted={handleCompleted}
      />
    </Box>
  );
}
