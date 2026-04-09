"use client";

import { CardHistoryItem } from "@/types/jackpot-prizes/cardHistory";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

interface CardHistoryTooltipProps {
  cardHistory: CardHistoryItem[];
  loading: boolean;
  error: string | null;
}

export default function CardHistoryTooltip({
  cardHistory,
  loading,
  error,
}: CardHistoryTooltipProps) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={2}>
        <CircularProgress size={20} />
        <Typography variant="body2" sx={{ ml: 1 }}>
          Loading card history...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2} maxWidth={400}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!cardHistory || cardHistory.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="body2" color="text.secondary">
          No card history available
        </Typography>
      </Box>
    );
  }

  const formatDate = (dateString: string) => {
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
  };

  const getTransferTypeColor = (type: string): "success" | "warning" | "info" | "default" => {
    switch (type.toLowerCase()) {
      case "market_purchase":
        return "success";
      case "market_sale":
        return "warning";
      case "transfer":
        return "info";
      case "current":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Box p={2} maxWidth={600} maxHeight={400} sx={{ overflowY: "auto" }}>
      <Typography variant="h6" gutterBottom>
        Card History
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cardHistory.map((item, index) => (
              <TableRow key={`${item.card_id}-${index}`} hover>
                <TableCell>
                  <Typography variant="body2" fontSize="0.75rem">
                    {formatDate(item.transfer_date)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.transfer_type.replace("_", " ")}
                    size="small"
                    color={getTransferTypeColor(item.transfer_type)}
                    sx={{ fontSize: "0.65rem", height: 20 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontSize="0.75rem">
                    {item.from_player || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontSize="0.75rem">
                    {item.to_player || "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  {item.payment_amount && parseFloat(item.payment_amount) > 0 ? (
                    <Typography variant="body2" fontSize="0.75rem" color="success.main">
                      ${item.payment_amount} {item.payment_currency}
                    </Typography>
                  ) : (
                    <Typography variant="body2" fontSize="0.75rem" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Showing {cardHistory.length} transaction{cardHistory.length !== 1 ? "s" : ""}
      </Typography>
    </Box>
  );
}
