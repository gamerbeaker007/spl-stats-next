"use client";

import { CardFilterDrawer } from "@/components/multi-dashboard/dashboard/CardFilterDrawer";
import { PlayerDashboardContent } from "@/components/multi-dashboard/dashboard/PlayerDashboardContent";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import { useAccountSelectorState } from "@/hooks/useAccountSelectorState";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { CardFilterProvider } from "@/lib/frontend/context/CardFilterContext";
import { Box, Skeleton, Typography } from "@mui/material";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";

const LS_KEY = "collection-cards-selection-v1";

function PlayerDashboardSkeleton() {
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
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const userParam = searchParams.get("users");
  const router = useRouter();
  const pathname = usePathname();
  const {
    monitoredAccounts,
    selectedAccount,
    setSelectedAccount,
    addAccountInput,
    setAddAccountInput,
    accountOptions,
    addLocalAccount,
    removeLocalAccount,
  } = useAccountSelectorState({
    storageKey: LS_KEY,
    loggedInUsername: user?.username,
  });

  const selectedUsersFromUrl = useMemo(() => {
    if (!userParam) return [];
    return userParam
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0 && accountOptions.includes(entry));
  }, [accountOptions, userParam]);

  const selectedUsers = useMemo(() => {
    if (selectedUsersFromUrl.length > 0) return selectedUsersFromUrl;
    if (selectedAccount && accountOptions.includes(selectedAccount)) {
      return [selectedAccount];
    }
    if (accountOptions.length > 0) {
      return [accountOptions[0]];
    }
    return [];
  }, [accountOptions, selectedAccount, selectedUsersFromUrl]);

  useEffect(() => {
    if (selectedUsers.length === 0) return;
    const nextParam = selectedUsers.join(",");
    const currentParam = userParam ?? "";
    if (currentParam === nextParam) return;
    router.replace(`${pathname}?users=${encodeURIComponent(nextParam)}`);
  }, [pathname, router, selectedUsers, userParam]);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
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
            setSelectedAccount(nextUsers[0]);
            router.replace(`${pathname}?users=${encodeURIComponent(nextUsers.join(","))}`);
          }}
          addAccountInput={addAccountInput}
          onAddAccountInputChange={setAddAccountInput}
          onAddAccount={addLocalAccount}
          onRemoveSelected={() => removeLocalAccount(selectedUsers[0] ?? "")}
          removeDisabled={!selectedUsers[0] || monitoredAccounts.includes(selectedUsers[0])}
        />
      </Box>

      {selectedUsers.length > 0 ? (
        <CardFilterProvider key="filter-provider">
          <DrawerAndContent selectedUsers={selectedUsers} />
        </CardFilterProvider>
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="35vh">
          <Typography>Select or add an account to view card collection data.</Typography>
        </Box>
      )}
    </Box>
  );
}

function DrawerAndContent({ selectedUsers }: Readonly<{ selectedUsers: string[] }>) {
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
            <Suspense fallback={<PlayerDashboardSkeleton />}>
              <PlayerDashboardContent
                username={username}
                showHeader={multipleSelected}
                selectableAccounts={selectedUsers}
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

export default function DashboardClient() {
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
