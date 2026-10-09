"use client";

import type { CardHistoryItem } from "@/types/jackpot-prizes/cardHistory";
import {
  Alert,
  alpha,
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function transferTypeColor(type: string): "success" | "warning" | "info" | "default" {
  switch (type.toLowerCase()) {
    case "market_purchase":
      return "success";
    case "market_sale":
      return "warning";
    case "transfer":
      return "info";
    default:
      return "default";
  }
}

/**
 * Transfer/market history of one card (uid), incl. loading/error/empty states.
 * No size limits: the parent (dialog, side pane) decides width and scrolling.
 */
export default function CardHistoryTable({
  cardHistory,
  loading,
  error,
  dense = false,
}: Readonly<{
  cardHistory: CardHistoryItem[] | null;
  loading: boolean;
  error: string | null;
  /** Compact styling for narrow side panes. */
  dense?: boolean;
}>) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  if (!cardHistory || cardHistory.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
        No card history available
      </Typography>
    );
  }

  const cellSx = dense ? { fontSize: "0.7rem", px: 0.5 } : undefined;
  const headSx = { ...cellSx, fontWeight: "bold" };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
        {cardHistory.length} transaction{cardHistory.length !== 1 ? "s" : ""}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headSx}>Date</TableCell>
              <TableCell sx={headSx}>Type</TableCell>
              <TableCell sx={headSx}>From</TableCell>
              <TableCell sx={headSx}>To</TableCell>
              <TableCell sx={headSx}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardHistory.map((item, index) => (
              <TableRow
                key={`${item.card_id}-${index}`}
                hover
                sx={(theme) => ({
                  backgroundColor:
                    index % 2 === 1 ? alpha(theme.palette.primary.main, 0.08) : undefined,
                })}
              >
                <TableCell sx={{ ...cellSx }}>{formatDate(item.transfer_date)}</TableCell>
                <TableCell sx={dense ? { px: 0.5 } : undefined}>
                  <Chip
                    label={item.transfer_type.replace("_", " ")}
                    size="small"
                    color={transferTypeColor(item.transfer_type)}
                    sx={{ fontSize: dense ? "0.6rem" : "0.65rem", height: dense ? 18 : 20 }}
                  />
                </TableCell>
                <TableCell sx={cellSx}>{item.from_player || "—"}</TableCell>
                <TableCell sx={cellSx}>{item.to_player || "—"}</TableCell>
                <TableCell sx={cellSx}>
                  {item.payment_amount && Number.parseFloat(item.payment_amount) > 0 ? (
                    <Typography variant="body2" fontSize="inherit" color="success.main">
                      ${item.payment_amount} {item.payment_currency}
                    </Typography>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
