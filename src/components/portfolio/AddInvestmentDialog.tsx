"use client";

import type { InvestmentEntry } from "@/lib/backend/actions/portfolio-actions";
import {
  addUserInvestmentAction,
  deleteUserInvestmentAction,
  getPortfolioInvestmentsAction,
  updateUserInvestmentNotesAction,
} from "@/lib/backend/actions/portfolio-actions";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MdCheck, MdClose, MdDelete, MdEdit } from "react-icons/md";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedAccounts: string[];
  accounts: string[];
  investments: InvestmentEntry[];
  onSuccess: (options?: { silent?: boolean }) => Promise<void>;
}

const PAGE_SIZE = 10;
const MAX_NOTES_LENGTH = 140;

type SortField = "date" | "account" | "type" | "amount" | "running" | "notes";

type SortDirection = "asc" | "desc";

type InvestmentRow = InvestmentEntry & { running: number };

function normalizeNotesInput(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .slice(0, MAX_NOTES_LENGTH);
}

export default function AddInvestmentDialog({
  open,
  onClose,
  selectedAccounts,
  accounts,
  investments,
  onSuccess,
}: Props) {
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAccount, setFormAccount] = useState(accounts[0] ?? "");
  const [formAmount, setFormAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [page, setPage] = useState(0);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [dialogInvestments, setDialogInvestments] = useState<InvestmentEntry[]>(investments);
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const disableActions = loading || entriesLoading;

  const refreshEntries = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setEntriesLoading(true);
      }
      try {
        const refreshed = await getPortfolioInvestmentsAction(selectedAccounts);
        setDialogInvestments(refreshed);
      } catch (err) {
        setMsg({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to refresh investment entries.",
        });
      } finally {
        if (!silent) {
          setEntriesLoading(false);
        }
      }
    },
    [selectedAccounts]
  );

  useEffect(() => {
    if (!open) return;
    setPage(0);
    setDialogInvestments(investments);
    void refreshEntries();
  }, [open, investments, refreshEntries]);

  useEffect(() => {
    if (!open) return;
    setDialogInvestments(investments);
  }, [investments, open]);

  async function handleAdd(type: "deposit" | "withdraw") {
    const amount = parseFloat(formAmount);
    if (!formDate || !formAccount || isNaN(amount) || amount <= 0) {
      setMsg({ type: "error", text: "Date, account and a positive amount are required." });
      return;
    }
    setLoading(true);
    setMsg(null);
    const res = await addUserInvestmentAction(
      formDate,
      formAccount,
      amount,
      type,
      normalizeNotesInput(formNotes) || undefined
    );
    if (res.success) {
      setMsg({
        type: "success",
        text: `${type === "deposit" ? "Deposit" : "Withdrawal"} of $${amount.toFixed(2)} recorded.`,
      });
      setFormAmount("");
      setFormNotes("");
      setPage(0);
      await refreshEntries({ silent: true });
      await onSuccess({ silent: true });
    } else {
      setMsg({ type: "error", text: res.error });
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    setConfirmDeleteId(null);
    const res = await deleteUserInvestmentAction(id);
    if (res.success) {
      await refreshEntries({ silent: true });
      await onSuccess({ silent: true });
    }
    setDeleting(null);
  }

  async function handleSaveNotes(id: string) {
    setSavingNotes(true);
    const res = await updateUserInvestmentNotesAction(id, normalizeNotesInput(editingNotesText));
    if (res.success) {
      setEditingNotesId(null);
      await refreshEntries({ silent: true });
      await onSuccess({ silent: true });
    } else {
      setMsg({ type: "error", text: res.error });
    }
    setSavingNotes(false);
  }

  const rows = useMemo<InvestmentRow[]>(() => {
    const chronological = [...dialogInvestments].sort((a, b) => {
      if (a.date === b.date) return a.id.localeCompare(b.id);
      return a.date.localeCompare(b.date);
    });

    let running = 0;
    return chronological.map((inv) => {
      running += inv.amount;
      return { ...inv, running };
    });
  }, [dialogInvestments]);

  const sortedRows = useMemo(() => {
    const next = [...rows];
    next.sort((a, b) => {
      const compare = (() => {
        if (sortBy === "date") return a.date.localeCompare(b.date);
        if (sortBy === "account") return a.username.localeCompare(b.username);
        if (sortBy === "type")
          return a.amount >= 0 ? (b.amount >= 0 ? 0 : 1) : b.amount >= 0 ? -1 : 0;
        if (sortBy === "amount") return a.amount - b.amount;
        if (sortBy === "running") return a.running - b.running;
        return (a.notes ?? "").localeCompare(b.notes ?? "");
      })();
      return sortDir === "asc" ? compare : -compare;
    });
    return next;
  }, [rows, sortBy, sortDir]);

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    if (field === "date") {
      setSortDir("desc");
      return;
    }
    setSortDir("asc");
  }

  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const pagedRows = sortedRows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Investment Entries
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <MdClose />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* ---- Add form ---- */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          Record a deposit or withdrawal for a specific date and account.
        </Typography>
        <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" sx={{ mb: 1 }}>
          <TextField
            label="Date"
            type="date"
            size="small"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
            disabled={disableActions}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Account</InputLabel>
            <Select
              value={formAccount}
              label="Account"
              onChange={(e) => setFormAccount(e.target.value)}
              disabled={disableActions}
            >
              {accounts.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Amount ($)"
            type="number"
            size="small"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            inputProps={{ min: 0, step: "0.01" }}
            sx={{ width: 140 }}
            disabled={disableActions}
          />
          <TextField
            label="Notes (optional)"
            size="small"
            multiline
            minRows={2}
            maxRows={4}
            value={formNotes}
            onChange={(e) => setFormNotes(normalizeNotesInput(e.target.value))}
            inputProps={{ maxLength: MAX_NOTES_LENGTH }}
            helperText={`${formNotes.length}/${MAX_NOTES_LENGTH}`}
            sx={{ minWidth: 260 }}
            disabled={disableActions}
          />
          <Button
            variant="contained"
            color="success"
            disabled={disableActions}
            startIcon={loading ? <CircularProgress size={14} /> : undefined}
            onClick={() => handleAdd("deposit")}
            sx={{ mt: 0.5 }}
          >
            Deposit
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={disableActions}
            onClick={() => handleAdd("withdraw")}
            sx={{ mt: 0.5 }}
          >
            Withdraw
          </Button>
        </Stack>
        {msg && (
          <Alert severity={msg.type} sx={{ mb: 2 }}>
            {msg.text}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* ---- Existing entries ---- */}
        <Typography variant="subtitle2" gutterBottom>
          Recorded entries ({dialogInvestments.length})
        </Typography>
        {entriesLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Loading investment entries...
            </Typography>
          </Box>
        ) : dialogInvestments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No entries yet.
          </Typography>
        ) : (
          <>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === "date"}
                        direction={sortBy === "date" ? sortDir : "desc"}
                        onClick={() => toggleSort("date")}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === "account"}
                        direction={sortBy === "account" ? sortDir : "asc"}
                        onClick={() => toggleSort("account")}
                      >
                        Account
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === "type"}
                        direction={sortBy === "type" ? sortDir : "asc"}
                        onClick={() => toggleSort("type")}
                      >
                        Type
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortBy === "amount"}
                        direction={sortBy === "amount" ? sortDir : "asc"}
                        onClick={() => toggleSort("amount")}
                      >
                        Amount ($)
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortBy === "running"}
                        direction={sortBy === "running" ? sortDir : "asc"}
                        onClick={() => toggleSort("running")}
                      >
                        Running ($)
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === "notes"}
                        direction={sortBy === "notes" ? sortDir : "asc"}
                        onClick={() => toggleSort("notes")}
                      >
                        Notes
                      </TableSortLabel>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedRows.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.date}</TableCell>
                      <TableCell>{inv.username}</TableCell>
                      <TableCell>
                        <Chip
                          label={inv.amount >= 0 ? "Deposit" : "Withdraw"}
                          color={inv.amount >= 0 ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: inv.amount >= 0 ? "success.main" : "error.main" }}
                      >
                        {inv.amount >= 0 ? "+" : "-"}${Math.abs(inv.amount).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">${inv.running.toFixed(2)}</TableCell>
                      <TableCell sx={{ maxWidth: 320, minWidth: 180 }}>
                        {editingNotesId === inv.id ? (
                          <Stack direction="row" spacing={0.5} alignItems="flex-start">
                            <TextField
                              size="small"
                              multiline
                              minRows={2}
                              maxRows={4}
                              value={editingNotesText}
                              onChange={(e) =>
                                setEditingNotesText(normalizeNotesInput(e.target.value))
                              }
                              inputProps={{ maxLength: MAX_NOTES_LENGTH }}
                              sx={{ minWidth: 180 }}
                              autoFocus
                            />
                            <Tooltip title="Save">
                              <span>
                                <IconButton
                                  size="small"
                                  color="success"
                                  disabled={savingNotes || disableActions}
                                  onClick={() => handleSaveNotes(inv.id)}
                                >
                                  {savingNotes ? <CircularProgress size={14} /> : <MdCheck />}
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Cancel">
                              <IconButton size="small" onClick={() => setEditingNotesId(null)}>
                                <MdClose />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={0.5} alignItems="flex-start">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {inv.notes || "—"}
                            </Typography>
                            <Tooltip title="Edit notes">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingNotesId(inv.id);
                                  setEditingNotesText(inv.notes ?? "");
                                }}
                              >
                                <MdEdit size={14} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell padding="none" sx={{ whiteSpace: "nowrap" }}>
                        {confirmDeleteId === inv.id ? (
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button
                              size="small"
                              color="error"
                              variant="contained"
                              disabled={deleting === inv.id || disableActions}
                              onClick={() => handleDelete(inv.id)}
                              sx={{ minWidth: 0, px: 1 }}
                            >
                              {deleting === inv.id ? <CircularProgress size={12} /> : "Yes"}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={disableActions}
                              onClick={() => setConfirmDeleteId(null)}
                              sx={{ minWidth: 0, px: 1 }}
                            >
                              No
                            </Button>
                          </Stack>
                        ) : (
                          <IconButton
                            size="small"
                            color="error"
                            disabled={deleting !== null || disableActions}
                            onClick={() => setConfirmDeleteId(inv.id)}
                          >
                            <MdDelete />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={sortedRows.length}
              page={safePage}
              onPageChange={(_e, newPage) => setPage(newPage)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
              labelRowsPerPage=""
            />
          </>
        )}

        <Box sx={{ mt: 2 }}>
          <Button onClick={onClose} variant="outlined" fullWidth>
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
