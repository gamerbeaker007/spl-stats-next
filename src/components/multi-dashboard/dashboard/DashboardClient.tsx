"use client";

import { CardFilterDrawer } from "@/components/multi-dashboard/dashboard/CardFilterDrawer";
import { PlayerDashboardContent } from "@/components/multi-dashboard/dashboard/PlayerDashboardContent";
import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { CardFilterProvider } from "@/lib/frontend/context/CardFilterContext";
import { Box, Skeleton, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

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
  const [usernames, setUsernames] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const searchParams = useSearchParams();
  const userParam = searchParams.get("users");
  const router = useRouter();

  useEffect(() => {
    getMonitoredAccounts().then((accounts) => {
      setUsernames(accounts.map((a) => a.username));
      setIsInitialized(true);
    });
  }, []);

  // Derive selected users from URL parameter (comma-separated)
  const selectedUsers = useMemo(() => {
    if (!isInitialized || usernames.length === 0) return [];

    if (userParam) {
      // Parse comma-separated users from URL
      const users = userParam
        .split(",")
        .map((u) => u.trim())
        .filter((u) => usernames.includes(u));
      return users.length > 0 ? users : [usernames[0]];
    }

    // Default to first user if no URL param
    return [usernames[0]];
  }, [userParam, usernames, isInitialized]);

  const handleUserChange = (_event: React.MouseEvent<HTMLElement>, newUsers: string[]) => {
    if (newUsers.length === 0) return;
    // Update URL with comma-separated users
    const newParam = newUsers.join(",");
    router.push(`/multi-dashboard/collection?users=${encodeURIComponent(newParam)}`);
  };

  // Redirect to home if no users
  useEffect(() => {
    if (isInitialized && usernames.length === 0) {
      router.push("/");
    }
  }, [isInitialized, usernames, router]);

  // Show loading only while not initialized
  if (!isInitialized) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography sx={{ ml: 2 }}>Loading users...</Typography>
      </Box>
    );
  }

  // Show nothing while redirecting (if no users)
  if (usernames.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography sx={{ ml: 2 }}>Redirecting to home...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* User Toggle Buttons */}
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
        <ToggleButtonGroup
          value={selectedUsers}
          onChange={handleUserChange}
          aria-label="user selection"
          sx={{
            flexWrap: "wrap",
            gap: 0,
          }}
        >
          {usernames.map((username) => {
            const isSelected = selectedUsers.includes(username);
            return (
              <ToggleButton
                key={username}
                value={username}
                aria-label={username}
                sx={{
                  px: 5,
                  textTransform: "none",
                  fontWeight: isSelected ? "bold" : "normal",
                  backgroundColor: isSelected ? "primary.main" : "transparent",
                  color: isSelected ? "primary.contrastText" : "text.primary",
                  border: isSelected ? "2px solid" : "1px solid",
                  borderColor: isSelected ? "primary.main" : "divider",
                  borderRadius: 10,
                }}
              >
                {username}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </Box>

      {/* Content Area with Filter Context - Drawer loaded immediately */}
      {selectedUsers.length > 0 && (
        <CardFilterProvider key="filter-provider">
          <DrawerAndContent selectedUsers={selectedUsers} />
        </CardFilterProvider>
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
              <PlayerDashboardContent username={username} showHeader={multipleSelected} />
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
