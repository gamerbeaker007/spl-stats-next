"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { DashboardSettings } from "@/components/multi-dashboard/DashboardSettings";
import { useDashboardConfig } from "@/hooks/multi-account-dashboard/useDashboardConfig";
import { useReAuth } from "@/hooks/useReAuth";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import KeyIcon from "@mui/icons-material/Key";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useLocalStorageValue } from "@/hooks/useLocalStorageValue";
import { useMemo, useState } from "react";
import { PlayerCard } from "./PlayerCard";

const STORAGE_KEY = "spl-dashboard-order";

function applyStoredOrder(usernames: string[], stored: string[]): string[] {
  const set = new Set(usernames);
  // Keep only stored names that still exist, preserving order
  const ordered = stored.filter((u) => set.has(u));
  // Append any new accounts (not in stored order) at the end
  const missing = usernames.filter((u) => !ordered.includes(u));
  return [...ordered, ...missing];
}

export default function PlayerStatusDashboard() {
  const { monitoredAccounts } = useAccounts();
  const { config, loading: configLoading, updateConfig } = useDashboardConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reAuthAllBusy, setReAuthAllBusy] = useState(false);
  const [reAuthResult, setReAuthResult] = useState<{
    succeeded: string[];
    failed: string[];
  } | null>(null);
  const { reAuth } = useReAuth();

  // Accounts (and their SPL token state) come from AccountsContext, which
  // already fetched them — one request for the whole dashboard.
  const [storedOrder, setStoredOrder] = useLocalStorageValue(STORAGE_KEY);
  const loading = storedOrder === undefined;
  const usernames = useMemo(() => {
    try {
      const stored: string[] = storedOrder ? JSON.parse(storedOrder) : [];
      return applyStoredOrder(monitoredAccounts, stored);
    } catch {
      return monitoredAccounts;
    }
  }, [monitoredAccounts, storedOrder]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = usernames.indexOf(active.id as string);
    const newIndex = usernames.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    setStoredOrder(JSON.stringify(arrayMove(usernames, oldIndex, newIndex)));
  };

  const handleReAuthAll = async () => {
    setReAuthAllBusy(true);
    setReAuthResult(null);
    const succeeded: string[] = [];
    const failed: string[] = [];
    try {
      // Re-authenticate every account — Keychain will prompt once per account.
      for (const username of usernames) {
        const result = await reAuth(username);
        if (result.success) succeeded.push(username);
        else failed.push(username);
      }
    } finally {
      setReAuthAllBusy(false);
      setReAuthResult({ succeeded, failed });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 6, lg: 8 } }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography>Loading accounts...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ px: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Splinterlands Multi-Account Dashboard</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Tooltip title="Dashboard settings">
            <span>
              <IconButton
                onClick={() => setSettingsOpen(true)}
                disabled={configLoading || reAuthAllBusy || usernames.length === 0}
                color="default"
              >
                <SettingsIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            color="warning"
            startIcon={reAuthAllBusy ? <CircularProgress size={16} /> : <KeyIcon />}
            onClick={handleReAuthAll}
            disabled={reAuthAllBusy || usernames.length === 0}
          >
            Re-authenticate All
          </Button>
        </Box>
      </Box>

      {reAuthResult && (
        <Alert
          severity={reAuthResult.failed.length === 0 ? "success" : "warning"}
          onClose={() => setReAuthResult(null)}
          sx={{ mb: 2 }}
        >
          {reAuthResult.succeeded.length > 0 && (
            <>Re-authenticated: {reAuthResult.succeeded.join(", ")}. </>
          )}
          {reAuthResult.failed.length > 0 && <>Failed: {reAuthResult.failed.join(", ")}.</>}
          {reAuthResult.succeeded.length === 0 && reAuthResult.failed.length === 0 && (
            <>No accounts to re-authenticate.</>
          )}
        </Alert>
      )}

      {usernames.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={usernames} strategy={verticalListSortingStrategy}>
            <Box display="flex" flexDirection="row" flexWrap="wrap" gap={2}>
              {usernames.map((username) => (
                <PlayerCard key={username} username={username} config={config} />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      ) : (
        <Alert severity="info">
          No monitored accounts yet. Add accounts on the{" "}
          <a href="/users" suppressHydrationWarning>
            Users page
            <OpenInNewIcon sx={{ fontSize: 13, verticalAlign: "middle", ml: 0.5 }} />
          </a>{" "}
        </Alert>
      )}

      <DashboardSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSave={updateConfig}
      />
    </Container>
  );
}
