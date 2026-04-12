"use client";

import { useLogs } from "@/hooks/useLogs";
import type { LogLevel } from "@/lib/backend/db/logs";
import {
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";

const LEVEL_COLORS = {
  info: "info",
  warn: "warning",
  error: "error",
} as const;

const FILTERS: { label: string; value: LogLevel | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Info", value: "info" },
  { label: "Warn", value: "warn" },
  { label: "Error", value: "error" },
];

function MetaCell({ meta }: { meta: unknown }) {
  const [open, setOpen] = useState(false);
  if (!meta || (typeof meta === "object" && Object.keys(meta as object).length === 0)) return null;
  return (
    <Box>
      <Chip
        label="meta"
        size="small"
        variant="outlined"
        onClick={() => setOpen((v) => !v)}
        sx={{ cursor: "pointer" }}
      />
      <Collapse in={open}>
        <Box
          component="pre"
          sx={{
            mt: 1,
            p: 1,
            fontSize: "0.75rem",
            bgcolor: "action.hover",
            borderRadius: 1,
            overflowX: "auto",
            maxWidth: 400,
          }}
        >
          {JSON.stringify(meta, null, 2)}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function LogsContent() {
  const {
    logs,
    total,
    pages,
    loading,
    error,
    page,
    setPage,
    level,
    changeLevel,
    search,
    changeSearch,
    refresh,
  } = useLogs();

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5">Application Logs</Typography>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={refresh} disabled={loading}>
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Search bar */}
        <TextField
          size="small"
          placeholder="Search messages…"
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => changeSearch("")}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
          sx={{ maxWidth: 400 }}
        />

        {/* Level filter */}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Level:
          </Typography>
          {FILTERS.map(({ label, value }) => (
            <Chip
              key={label}
              label={label}
              size="small"
              color={value ? LEVEL_COLORS[value] : "default"}
              variant={level === value ? "filled" : "outlined"}
              onClick={() => changeLevel(value)}
            />
          ))}
          <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
            {total} total
          </Typography>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 180 }}>Timestamp</TableCell>
                <TableCell sx={{ width: 80 }}>Level</TableCell>
                <TableCell>Message</TableCell>
                <TableCell sx={{ width: 100 }}>Meta</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell
                    sx={{ fontFamily: "monospace", fontSize: "0.75rem", whiteSpace: "nowrap" }}
                  >
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.level}
                      size="small"
                      color={LEVEL_COLORS[log.level as LogLevel] ?? "default"}
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
                    {log.message}
                  </TableCell>
                  <TableCell>
                    <MetaCell meta={log.meta} />
                  </TableCell>
                </TableRow>
              ))}
              {!loading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No logs found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {pages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
