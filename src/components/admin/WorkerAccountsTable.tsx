"use client";

import {
  Box,
  Chip,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";

export type WorkerAccountRow = {
  username: string;
  syncStatus: "pending" | "processing" | "failed" | "completed";
  completedSyncKeys: number;
  totalSyncKeys: number;
  minSeasonProcessed: number;
  lastUpdatedIso: string | null;
  lastSyncedKey: string | null;
  error: string | null;
  tokenStatus: string;
  tokenVerifiedAtIso: string | null;
  jwtExpiresAtIso: string | null;
};

const PAGE_SIZE = 25;

const SYNC_STATUS_COLOR: Record<
  WorkerAccountRow["syncStatus"],
  "default" | "info" | "error" | "success"
> = {
  pending: "default",
  processing: "info",
  failed: "error",
  completed: "success",
};

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

function jwtExpiryInfo(expiresAtIso: string | null): {
  label: string;
  color: "success" | "warning" | "error" | "default";
  title: string;
  category: "activated" | "expired" | "no-expiry";
} {
  if (!expiresAtIso) {
    return {
      label: "no expiry",
      color: "default",
      title: "No JWT expiry stored",
      category: "no-expiry",
    };
  }

  const expiresAt = new Date(expiresAtIso);
  const now = Date.now();
  const diffMs = expiresAt.getTime() - now;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    const expiredDaysAgo = Math.floor(-diffDays);
    return {
      label: `expired ${expiredDaysAgo}d ago`,
      color: "error",
      title: `Expired ${expiresAt.toISOString()}`,
      category: "expired",
    };
  }

  if (diffDays < 2) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return {
      label: hours < 24 ? `${hours}h left` : `${Math.floor(diffDays)}d left`,
      color: "warning",
      title: `Expires ${expiresAt.toISOString()}`,
      category: "activated",
    };
  }

  const days = Math.floor(diffDays);
  return {
    label: `${days}d left`,
    color: "success",
    title: `Expires ${expiresAt.toISOString()}`,
    category: "activated",
  };
}

export default function WorkerAccountsTable({
  accounts,
  currentSeasonId,
}: Readonly<{
  accounts: WorkerAccountRow[];
  currentSeasonId: number;
}>) {
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(accounts.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visibleAccounts = accounts.slice(start, start + PAGE_SIZE);

  const expiryCounts = useMemo(() => {
    let activated = 0;
    let expired = 0;
    let noExpiry = 0;

    for (const account of accounts) {
      const expiry = jwtExpiryInfo(account.jwtExpiresAtIso);
      if (expiry.category === "activated") activated += 1;
      if (expiry.category === "expired") expired += 1;
      if (expiry.category === "no-expiry") noExpiry += 1;
    }

    return { activated, expired, noExpiry };
  }, [accounts]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          label={`Activated ${expiryCounts.activated}/${accounts.length}`}
          size="small"
          color="success"
          variant="outlined"
        />
        <Chip
          label={`Expired ${expiryCounts.expired}/${accounts.length}`}
          size="small"
          color="error"
          variant="outlined"
        />
        <Chip
          label={`No expiry ${expiryCounts.noExpiry}/${accounts.length}`}
          size="small"
          color="default"
          variant="outlined"
        />
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Account</TableCell>
              <TableCell>Token</TableCell>
              <TableCell>JWT Expiry</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sync Key</TableCell>
              <TableCell>Last Synced Key</TableCell>
              <TableCell>Season</TableCell>
              <TableCell>Last Sync</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleAccounts.map((acc) => {
              const expiry = jwtExpiryInfo(acc.jwtExpiresAtIso);
              const tokenVerifiedAt = acc.tokenVerifiedAtIso
                ? new Date(acc.tokenVerifiedAtIso)
                : null;
              const lastUpdatedAt = acc.lastUpdatedIso ? new Date(acc.lastUpdatedIso) : null;

              return (
                <TableRow key={acc.username} hover>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {acc.username}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={acc.tokenStatus}
                      size="small"
                      color={
                        acc.tokenStatus === "valid"
                          ? "success"
                          : acc.tokenStatus === "invalid"
                            ? "error"
                            : "default"
                      }
                      variant="outlined"
                      title={
                        tokenVerifiedAt
                          ? `Verified ${formatRelativeTime(tokenVerifiedAt)}`
                          : undefined
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={expiry.label}
                      size="small"
                      color={expiry.color}
                      variant="outlined"
                      title={expiry.title}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5} alignItems="flex-start">
                      <Chip
                        label={acc.syncStatus}
                        size="small"
                        color={SYNC_STATUS_COLOR[acc.syncStatus]}
                        variant="outlined"
                      />
                      {acc.error && (
                        <Typography
                          variant="caption"
                          color="error.main"
                          sx={{ maxWidth: 200, display: "block" }}
                          noWrap
                        >
                          {acc.error}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={
                        acc.completedSyncKeys === acc.totalSyncKeys && acc.totalSyncKeys > 0
                          ? "text.primary"
                          : "text.secondary"
                      }
                    >
                      {acc.completedSyncKeys}/{acc.totalSyncKeys}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                      color="text.secondary"
                    >
                      {acc.lastSyncedKey ?? "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color={
                        acc.minSeasonProcessed >= currentSeasonId && currentSeasonId > 0
                          ? "success.main"
                          : "text.secondary"
                      }
                    >
                      {acc.minSeasonProcessed > 0
                        ? `${acc.minSeasonProcessed} / ${currentSeasonId}`
                        : "-"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {lastUpdatedAt ? formatRelativeTime(lastUpdatedAt) : "-"}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {pages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Pagination count={pages} page={safePage} onChange={(_, value) => setPage(value)} />
        </Box>
      )}
    </Stack>
  );
}
