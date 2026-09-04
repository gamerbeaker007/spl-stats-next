"use client";

import {
  DONATION_ACCOUNT,
  DONATION_MEMO,
  SUPPORTED_DONATION_CURRENCIES,
  type DonationCurrency,
} from "@/constants/support";
import {
  getSupportBalances,
  recordHiveTransferDonation,
  recordTokenTransferDonation,
} from "@/lib/backend/actions/support-actions";
import {
  broadcastHiveTransfer,
  broadcastTokenTransfer,
  waitForTransactions,
} from "@/lib/frontend/purchase/splBroadcast";
import { buildDonationTokenTransferPayload } from "@/lib/shared/support-op-builders";
import { dec_icon_url, hbd_icon_url, hive_icon_url, sps_icon_url } from "@/lib/staticsIconUrls";
import FavoriteIcon from "@mui/icons-material/Favorite";
import RefreshIcon from "@mui/icons-material/Refresh";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";

interface DonationSectionProps {
  username: string | null;
  authLoading: boolean;
  onMessage: (message: string, severity?: "success" | "error" | "info" | "warning") => void;
}

interface Balances {
  dec: number;
  sps: number;
  hive: number;
  hbd: number;
}

const ICONS: Record<DonationCurrency, string> = {
  DEC: dec_icon_url,
  SPS: sps_icon_url,
  HIVE: hive_icon_url,
  HBD: hbd_icon_url,
};

const DECIMALS: Record<DonationCurrency, number> = {
  DEC: 3,
  SPS: 3,
  HIVE: 3,
  HBD: 3,
};

const BALANCE_KEY: Record<DonationCurrency, keyof Balances> = {
  DEC: "dec",
  SPS: "sps",
  HIVE: "hive",
  HBD: "hbd",
};

export default function DonationSection({
  username,
  authLoading,
  onMessage,
}: Readonly<DonationSectionProps>) {
  const [balances, setBalances] = useState<Balances | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState<DonationCurrency>(SUPPORTED_DONATION_CURRENCIES[0]);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadingBalances = refreshing || (!!username && !authLoading && balances === null);
  const selectedBalance = balances?.[BALANCE_KEY[currency]] ?? null;
  const decimals = DECIMALS[currency];

  // Memoised because the mount effect below depends on it.
  const refreshBalances = useCallback(async () => {
    if (!username) return;
    setRefreshing(true);
    const result = await getSupportBalances();
    setBalances({ dec: result.dec, sps: result.sps, hive: result.hive, hbd: result.hbd });
    setBalanceError(result.error ?? null);
    setRefreshing(false);
  }, [username]);

  useEffect(() => {
    if (authLoading) return;
    void refreshBalances();
  }, [authLoading, refreshBalances]);

  const validateAmount = (value: string): string | null => {
    const parsed = Number.parseFloat(value);
    if (!value || Number.isNaN(parsed)) return "Enter a valid amount";
    if (!Number.isFinite(parsed)) return "Enter a finite amount";
    if (parsed <= 0) return "Amount must be greater than zero";
    if (selectedBalance !== null && parsed > selectedBalance) {
      return `Insufficient known balance (${selectedBalance.toFixed(decimals)} ${currency})`;
    }
    return null;
  };

  // Derived, not state: holding it in state made a currency switch validate the
  // amount against the previously selected currency's balance.
  const amountError = amount.length > 0 ? validateAmount(amount) : null;

  const confirmDonate = async () => {
    if (!username || amountError) {
      setConfirmOpen(false);
      return;
    }

    const parsedAmount = Number.parseFloat(amount);
    const isSplToken = currency === "DEC" || currency === "SPS";
    setConfirmOpen(false);
    setPending(true);

    try {
      const txId = isSplToken
        ? await broadcastTokenTransfer(
            username,
            buildDonationTokenTransferPayload(currency, parsedAmount)
          )
        : await broadcastHiveTransfer({
            account: username,
            to: DONATION_ACCOUNT,
            amount: parsedAmount,
            currency,
            memo: DONATION_MEMO,
          });

      // DEC/SPS settle through the SPL engine, so wait on it the way every other
      // broadcast in the app does. A wait that times out must not abandon a
      // transfer that did land — the record action below verifies the transfer
      // itself and reports the engine's own verdict — so the wait only paces us.
      // A HIVE/HBD transfer never reaches that engine and nothing in the browser
      // can see it, so its wait happens server-side instead.
      if (isSplToken) {
        await waitForTransactions([txId]).catch(() => undefined);
      }

      const record = isSplToken
        ? await recordTokenTransferDonation(txId)
        : await recordHiveTransferDonation(txId);

      if (record.status === "error") {
        onMessage(record.error, "error");
      } else if (record.status === "pending") {
        onMessage(record.message, "info");
      } else {
        setAmount("");
        onMessage(
          `Thank you. ${parsedAmount.toFixed(decimals)} ${currency} was sent to ${DONATION_ACCOUNT}.`,
          "success"
        );
      }

      // Refreshed on every outcome, not just success: the funds may well have
      // moved even when recording the donation failed. One real refresh replaces
      // the old optimistic guess plus timed re-poll.
      await refreshBalances();
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "Transaction failed or was cancelled",
        "error"
      );
    } finally {
      setPending(false);
    }
  };

  const balanceLabel = (() => {
    if (!username) return "Log in to see your balance";
    if (loadingBalances) return "Loading balance...";
    if (selectedBalance === null) return "Balance unavailable";
    return `Balance: ${selectedBalance.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })} ${currency}`;
  })();

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <FavoriteIcon color="error" />
          <Typography variant="h6" fontWeight={700}>
            Donate to Support Ongoing Development
          </Typography>
          {username ? (
            <Tooltip title="Refresh balances">
              <span>
                <IconButton
                  size="small"
                  onClick={() => void refreshBalances()}
                  disabled={loadingBalances}
                >
                  {loadingBalances ? (
                    <CircularProgress size={16} />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          All donations are sent directly to <strong>{DONATION_ACCOUNT}</strong> with memo &quot;
          {DONATION_MEMO}&quot;.
        </Typography>

        {balanceError ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {balanceError}
          </Alert>
        ) : null}

        <Box sx={{ display: "grid", gap: 1.5 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "minmax(170px, 1fr) minmax(170px, 1fr) auto" },
              gap: 1,
              alignItems: "start",
            }}
          >
            <FormControl size="small" fullWidth>
              <InputLabel id="donation-currency-select-label">Currency</InputLabel>
              <Select
                labelId="donation-currency-select-label"
                value={currency}
                label="Currency"
                onChange={(event) => setCurrency(event.target.value as DonationCurrency)}
                disabled={pending}
                renderValue={(value) => (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar src={ICONS[value]} alt={value} sx={{ width: 20, height: 20 }} />
                    <Typography variant="body2" fontWeight={700}>
                      {value}
                    </Typography>
                  </Box>
                )}
              >
                {SUPPORTED_DONATION_CURRENCIES.map((item) => (
                  <MenuItem key={item} value={item}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar src={ICONS[item]} alt={item} sx={{ width: 20, height: 20 }} />
                      <Typography variant="body2">{item}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              type="number"
              disabled={!username || pending}
              error={!!amountError}
              helperText={amountError ?? " "}
              inputProps={{ min: 0, step: "any" }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{currency}</InputAdornment>,
              }}
            />

            <Tooltip title={!username ? "Log in first to donate." : ""}>
              <span>
                <Button
                  variant="contained"
                  disabled={!username || pending || !!amountError || amount.length === 0}
                  onClick={() => setConfirmOpen(true)}
                  sx={{ minHeight: 40, whiteSpace: "nowrap" }}
                  startIcon={pending ? <CircularProgress size={14} color="inherit" /> : undefined}
                >
                  Donate
                </Button>
              </span>
            </Tooltip>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar src={ICONS[currency]} alt={currency} sx={{ width: 20, height: 20 }} />
            <Typography variant="body2" color="text.secondary">
              {balanceLabel}
            </Typography>
          </Box>
        </Box>

        <Dialog open={confirmOpen} onClose={() => !pending && setConfirmOpen(false)}>
          <DialogTitle>Confirm Donation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Donate{" "}
              <strong>
                {Number.parseFloat(amount || "0").toFixed(decimals)} {currency}
              </strong>{" "}
              to <strong>{DONATION_ACCOUNT}</strong>?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="contained" onClick={confirmDonate} disabled={pending}>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
