"use client";

import { useAdminSupportDonations } from "@/hooks/useAdminSupportDonations";
import type { SortOrder, SupportDonationSortField } from "@/lib/backend/db/support-donations";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";

const SORTABLE_COLUMNS: Array<{
  key: SupportDonationSortField;
  label: string;
  align?: "left" | "right";
}> = [
  { key: "date", label: "Date" },
  { key: "username", label: "Account" },
  { key: "currency", label: "Currency" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "usdValue", label: "USD", align: "right" },
  { key: "tx", label: "Tx" },
];

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value: string): string {
  return toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 8,
  });
}

function formatUsd(value: string): string {
  return `$${toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function sortDirection(
  currentSortBy: SupportDonationSortField,
  currentOrder: SortOrder,
  key: SupportDonationSortField
) {
  return currentSortBy === key ? currentOrder : "desc";
}

export default function SupportDonationsContent() {
  const {
    donations,
    total,
    pages,
    loading,
    error,
    page,
    setPage,
    sortBy,
    order,
    toggleSort,
    refresh,
  } = useAdminSupportDonations();

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5">Support Donations</Typography>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={refresh} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip label={`${total} total`} size="small" variant="outlined" />
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                {SORTABLE_COLUMNS.map((column) => (
                  <TableCell key={column.key} align={column.align ?? "left"}>
                    <TableSortLabel
                      active={sortBy === column.key}
                      direction={sortDirection(sortBy, order, column.key)}
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {donations.map((donation) => (
                <TableRow key={donation.id} hover>
                  <TableCell
                    sx={{ whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "0.8rem" }}
                  >
                    {new Date(donation.date).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {donation.username}
                  </TableCell>
                  <TableCell>{donation.currency}</TableCell>
                  <TableCell align="right">{formatAmount(donation.amount)}</TableCell>
                  <TableCell align="right">{formatUsd(donation.usdValue)}</TableCell>
                  <TableCell sx={{ maxWidth: 360 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                      noWrap
                      title={donation.tx}
                    >
                      {donation.tx}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && donations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No donations recorded yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {pages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Pagination count={pages} page={page} onChange={(_, value) => setPage(value)} />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
