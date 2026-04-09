"use client";

import {
  addUserInvestmentAction,
  deleteUserInvestmentAction,
} from "@/lib/backend/actions/portfolio-actions";
import type { InvestmentEntry } from "@/lib/backend/actions/portfolio-actions";
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
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { MdClose, MdDelete } from "react-icons/md";

interface Props {
  open: boolean;
  onClose: () => void;
  accounts: string[];
  investments: InvestmentEntry[];
  onSuccess: () => void;
}

export default function AddInvestmentDialog({
  open,
  onClose,
  accounts,
  investments,
  onSuccess,
}: Props) {
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAccount, setFormAccount] = useState(accounts[0] ?? "");
  const [formAmount, setFormAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleAdd(type: "deposit" | "withdraw") {
    const amount = parseFloat(formAmount);
    if (!formDate || !formAccount || isNaN(amount) || amount <= 0) {
      setMsg({ type: "error", text: "Date, account and a positive amount are required." });
      return;
    }
    setLoading(true);
    setMsg(null);
    const res = await addUserInvestmentAction(formDate, formAccount, amount, type);
    if (res.success) {
      setMsg({
        type: "success",
        text: `${type === "deposit" ? "Deposit" : "Withdrawal"} of $${amount.toFixed(2)} recorded.`,
      });
      setFormAmount("");
      onSuccess();
    } else {
      setMsg({ type: "error", text: res.error });
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    setConfirmDeleteId(null);
    const res = await deleteUserInvestmentAction(id);
    if (res.success) onSuccess();
    setDeleting(null);
  }

  // Build running totals for the table
  const rows = investments.reduce<Array<(typeof investments)[number] & { running: number }>>(
    (acc, inv) => {
      const running = (acc[acc.length - 1]?.running ?? 0) + inv.amount;
      return [...acc, { ...inv, running }];
    },
    []
  );

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
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
          <TextField
            label="Date"
            type="date"
            size="small"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Account</InputLabel>
            <Select
              value={formAccount}
              label="Account"
              onChange={(e) => setFormAccount(e.target.value)}
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
          />
          <Button
            variant="contained"
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : undefined}
            onClick={() => handleAdd("deposit")}
          >
            Deposit
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={loading}
            onClick={() => handleAdd("withdraw")}
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
          Recorded entries ({investments.length})
        </Typography>
        {investments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No entries yet.
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 340 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Account</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount ($)</TableCell>
                  <TableCell align="right">Running ($)</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((inv) => (
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
                    <TableCell padding="none" sx={{ whiteSpace: "nowrap" }}>
                      {confirmDeleteId === inv.id ? (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button
                            size="small"
                            color="error"
                            variant="contained"
                            disabled={deleting === inv.id}
                            onClick={() => handleDelete(inv.id)}
                            sx={{ minWidth: 0, px: 1 }}
                          >
                            {deleting === inv.id ? <CircularProgress size={12} /> : "Yes"}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
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
                          disabled={deleting !== null}
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
