"use client";

import { CardFilterDrawer } from "@/components/collection/cards/CardFilterDrawer";
import {
  CARD_SORT_OPTIONS,
  type CardSort,
  type CardSortField,
  DEFAULT_CARD_SORT,
  isPriceSort,
} from "@/components/collection/cards/card-sort";
import { PlayerCardsContent } from "@/components/collection/cards/PlayerCardsContent";
import MarketViewToggle from "@/components/collection/marketplace/MarketViewToggle";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import { getCollectionMarketPricesAction } from "@/lib/backend/actions/buy-missing-cc-actions";
import { revalidateTagsAction } from "@/lib/backend/actions/cache-actions";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { CardFilterProvider } from "@/lib/frontend/context/CardFilterContext";
import { useMarketplaceView } from "@/lib/frontend/context/MarketplaceViewContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdArrowDownward, MdArrowUpward, MdRefresh } from "react-icons/md";

function PlayerCardsSkeleton() {
  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Skeleton
        variant="rectangular"
        width={150}
        height={150}
        sx={{ borderRadius: "50%", mb: 2 }}
      />
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Skeleton variant="rectangular" width={250} height={400} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" width={250} height={400} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" width={250} height={400} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" width={250} height={400} sx={{ borderRadius: 2 }} />
      </Box>
    </Box>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const userParam = searchParams.get("users");
  const router = useRouter();
  const pathname = usePathname();
  const {
    monitoredAccounts,
    collectionSelectedAccounts,
    setCollectionSelectedAccounts,
    selectedAccount,
    accountOptions,
    addLocalAccount,
    removeLocalAccount,
    savedAccounts,
  } = useAccounts();
  const { notifyCollectionRefresh } = usePurchasePlan();
  const [addAccountInput, setAddAccountInput] = useState("");
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const { viewMode } = useMarketplaceView();
  const [showPrices, setShowPrices] = useState(false);
  // Shared by card and table view, so a header-click sort in the table carries over.
  const [sort, setSort] = useState<CardSort>(DEFAULT_CARD_SORT);
  const [marketPrices, setMarketPrices] = useState<
    Record<string, { qty: number; lowPriceBcx: number; lowPrice: number }> | undefined
  >(undefined);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedUsersFromUrl = useMemo(() => {
    if (!userParam) return [];
    return userParam
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0 && accountOptions.includes(entry));
  }, [accountOptions, userParam]);

  const selectedUsers = useMemo(() => {
    if (selectedUsersFromUrl.length > 0) return selectedUsersFromUrl;
    if (collectionSelectedAccounts.length > 0) {
      return collectionSelectedAccounts;
    }
    if (selectedAccount && accountOptions.includes(selectedAccount)) {
      return [selectedAccount];
    }
    if (accountOptions.length > 0) {
      return [accountOptions[0]];
    }
    return [];
  }, [accountOptions, collectionSelectedAccounts, selectedAccount, selectedUsersFromUrl]);

  const handleHardRefresh = useCallback(async () => {
    if (refreshCooldown || selectedUsers.length === 0) return;
    setRefreshCooldown(true);
    await revalidateTagsAction([{ type: "collection", usernames: selectedUsers }]);
    notifyCollectionRefresh();
    cooldownTimerRef.current = setTimeout(() => setRefreshCooldown(false), 60_000);
  }, [refreshCooldown, selectedUsers, notifyCollectionRefresh]);

  useEffect(
    () => () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    },
    []
  );

  useEffect(() => {
    if (selectedUsersFromUrl.length === 0) return;
    setCollectionSelectedAccounts(selectedUsersFromUrl);
  }, [selectedUsersFromUrl, setCollectionSelectedAccounts]);

  useEffect(() => {
    if (selectedUsers.length === 0) return;
    const nextParam = selectedUsers.join(",");
    const currentParam = userParam ?? "";
    if (currentParam === nextParam) return;
    router.replace(`${pathname}?users=${encodeURIComponent(nextParam)}`);
  }, [pathname, router, selectedUsers, userParam]);

  // The table always shows prices; card view needs them when shown or sorted by price.
  const needsPrices = viewMode === "table" || showPrices || isPriceSort(sort.field);

  useEffect(() => {
    if (!needsPrices || marketPrices) return;
    getCollectionMarketPricesAction().then(setMarketPrices);
  }, [needsPrices, marketPrices]);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
          mb: 4,
          p: 2,
          borderRadius: 2,
          backgroundColor: "background.paper",
        }}
      >
        <AccountSelectorBar
          multiSelect
          accounts={accountOptions}
          selectedAccounts={selectedUsers}
          onSelectedAccountsChange={(nextUsers) => {
            if (nextUsers.length === 0) return;
            setCollectionSelectedAccounts(nextUsers);
            router.replace(`${pathname}?users=${encodeURIComponent(nextUsers.join(","))}`);
          }}
          addAccountInput={addAccountInput}
          onAddAccountInputChange={setAddAccountInput}
          onAddAccount={() => {
            addLocalAccount(addAccountInput);
            setAddAccountInput("");
          }}
          monitoredAccounts={monitoredAccounts}
          localAccounts={savedAccounts}
          onRemoveAccount={removeLocalAccount}
          extraContent={
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <MarketViewToggle />
              <Tooltip
                title={
                  refreshCooldown ? "Refresh available in ~60s" : "Force refresh collection data"
                }
              >
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<MdRefresh />}
                    disabled={refreshCooldown || selectedUsers.length === 0}
                    onClick={handleHardRefresh}
                  >
                    Refresh
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          }
        />
        {viewMode === "card" && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={showPrices}
                  onChange={(e) => setShowPrices(e.target.checked)}
                />
              }
              label="Show Prices"
            />
            <TextField
              select
              size="small"
              label="Sort by"
              value={sort.field}
              onChange={(e) => setSort({ field: e.target.value as CardSortField, dir: sort.dir })}
              sx={{ minWidth: 160 }}
            >
              {CARD_SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <Tooltip title={sort.dir === "asc" ? "Ascending" : "Descending"}>
              <IconButton
                size="small"
                aria-label="Toggle sort direction"
                onClick={() => setSort({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" })}
              >
                {sort.dir === "asc" ? <MdArrowUpward /> : <MdArrowDownward />}
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      {selectedUsers.length > 0 ? (
        <CardFilterProvider key="filter-provider">
          <DrawerAndContent
            selectedUsers={selectedUsers}
            showPrices={showPrices}
            marketPrices={marketPrices}
            sort={sort}
            onSortChange={setSort}
          />
        </CardFilterProvider>
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="35vh">
          <Typography>Login or add an account to view card collection data.</Typography>
        </Box>
      )}
    </Box>
  );
}

function DrawerAndContent({
  selectedUsers,
  showPrices,
  marketPrices,
  sort,
  onSortChange,
}: Readonly<{
  selectedUsers: string[];
  showPrices?: boolean;
  marketPrices?: Record<string, { qty: number; lowPriceBcx: number; lowPrice: number }>;
  sort: CardSort;
  onSortChange: (sort: CardSort) => void;
}>) {
  const multipleSelected = selectedUsers.length > 1;

  return (
    <Box display="flex" flex={1}>
      {/* Main Content - Multiple players side by side */}
      <Box flex={1} display="flex" gap={2} flexWrap="wrap">
        {selectedUsers.map((username) => (
          <Box
            key={username}
            flex={multipleSelected ? "1 1 25%" : "1"}
            minWidth={multipleSelected ? "400px" : "auto"}
            sx={{
              border: multipleSelected ? 2 : 0,
              borderColor: "divider",
              borderRadius: 2,
              p: multipleSelected ? 2 : 0,
            }}
          >
            <Suspense fallback={<PlayerCardsSkeleton />}>
              <PlayerCardsContent
                username={username}
                showHeader={multipleSelected}
                selectableAccounts={selectedUsers}
                showPrices={showPrices}
                marketPrices={marketPrices}
                sort={sort}
                onSortChange={onSortChange}
              />
            </Suspense>
          </Box>
        ))}
      </Box>

      {/* Card Filter Drawer - uses context directly */}
      <CardFilterDrawer />
    </Box>
  );
}

export default function PlayerCardsClient() {
  return (
    <Suspense
      fallback={
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography sx={{ ml: 2 }}>Loading dashboard...</Typography>
        </Box>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
