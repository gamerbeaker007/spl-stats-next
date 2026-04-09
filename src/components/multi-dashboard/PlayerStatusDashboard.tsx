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

import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import { Alert, Box, Container, Typography } from "@mui/material";
import { useEffect, useState } from "react";
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
  const [usernames, setUsernames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonitoredAccounts()
      .then((accounts) => {
        const names = accounts.map((a) => a.username);
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const stored: string[] = raw ? JSON.parse(raw) : [];
          setUsernames(applyStoredOrder(names, stored));
        } catch {
          setUsernames(names);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setUsernames((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage may be unavailable
      }
      return next;
    });
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
    <Container maxWidth="xl" sx={{ px: { xs: 2, md: 6, lg: 8 } }}>
      <Typography variant="h4" gutterBottom>
        Splinterlands Multi-Account Dashboard
      </Typography>

      {usernames.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={usernames} strategy={verticalListSortingStrategy}>
            <Box display="flex" flexDirection="row" flexWrap="wrap" gap={2}>
              {usernames.map((username) => (
                <PlayerCard key={username} username={username} />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      ) : (
        <Alert severity="info">
          No monitored accounts yet. Add accounts on the{" "}
          <a href="/users" suppressHydrationWarning>
            Users
          </a>{" "}
          page.
        </Alert>
      )}
    </Container>
  );
}
