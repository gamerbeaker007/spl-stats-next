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
import { broadcastSupportOperation } from "@/lib/frontend/supportBroadcast";
import { buildHiveTransferOp, buildTokenTransferOp } from "@/lib/shared/support-op-builders";
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
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [amountError, setAmountError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadingBalances = useMemo(
    () => refreshing || (!!username && !authLoading && balances === null),
    [refreshing, username, authLoading, balances]
  );

  const selectedBalance = balances?.[BALANCE_KEY[currency]] ?? null;
  const decimals = DECIMALS[currency];

  const applyBalanceResult = useCallback(
    (result: Awaited<ReturnType<typeof getSupportBalances>>) => {
      setBalances({
        dec: result.dec,
        sps: result.sps,
        hive: result.hive,
        hbd: result.hbd,
      });
      setBalanceError(result.error ?? null);
      setRefreshing(false);
    },
    []
  );

  useEffect(() => {
    if (!username || authLoading) return;
    void getSupportBalances().then(applyBalanceResult);
  }, [username, authLoading, applyBalanceResult]);

  const refreshBalances = useCallback(() => {
    if (!username) return;
    setRefreshing(true);
    void getSupportBalances().then(applyBalanceResult);
  }, [username, applyBalanceResult]);

  const validateAmount = useCallback(
    (value: string): string | null => {
      const number = Number.parseFloat(value);
      if (!value || Number.isNaN(number)) return "Enter a valid amount";
      if (!Number.isFinite(number)) return "Enter a finite amount";
      if (number <= 0) return "Amount must be greater than zero";
      if (selectedBalance !== null && number > selectedBalance) {
        return `Insufficient known balance (${selectedBalance.toFixed(decimals)} ${currency})`;
      }
      return null;
    },
    [selectedBalance, decimals, currency]
  );

  const handleCurrencyChange = (event: SelectChangeEvent<DonationCurrency>) => {
    const next = event.target.value as DonationCurrency;
    setCurrency(next);
    setAmountError(validateAmount(amount));
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setAmountError(validateAmount(value));
  };

  const applyOptimisticBalance = useCallback(
    (donatedAmount: number) => {
      setBalances((prev) => {
        if (!prev) return prev;
        const key = BALANCE_KEY[currency];
        return { ...prev, [key]: Math.max(0, prev[key] - donatedAmount) };
      });
    },
    [currency]
  );

  const scheduleBalanceResync = useCallback(() => {
    refreshBalances();
    setTimeout(() => {
      refreshBalances();
    }, 6000);
  }, [refreshBalances]);

  const openConfirm = () => {
    const err = validateAmount(amount);
    setAmountError(err);
    if (!err) {
      setConfirmOpen(true);
    }
  };

  const confirmDonate = async () => {
    if (!username) return;

    const err = validateAmount(amount);
    if (err) {
      setAmountError(err);
      setConfirmOpen(false);
      return;
    }

    const parsedAmount = Number.parseFloat(amount);
    setConfirmOpen(false);
    setPending(true);

    try {
      if (currency === "DEC" || currency === "SPS") {
        const broadcast = await broadcastSupportOperation(
          username,
          buildTokenTransferOp({
            username,
            token: currency,
            to: DONATION_ACCOUNT,
            qty: parsedAmount,
          }),
          "active"
        );

        if (!broadcast.success || !broadcast.txId) {
          onMessage(broadcast.error ?? "Donation broadcast failed", "error");
          return;
        }

        let record = await recordTokenTransferDonation(broadcast.txId);
        for (let attempt = 0; attempt < 4 && record.status === "pending"; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          record = await recordTokenTransferDonation(broadcast.txId);
        }

        if (record.status === "success" || record.status === "already_recorded") {
          applyOptimisticBalance(parsedAmount);
          setAmount("");
          setAmountError(null);
          onMessage(
            `Thank you. ${parsedAmount.toFixed(decimals)} ${currency} was sent to ${DONATION_ACCOUNT}.`,
            "success"
          );
          scheduleBalanceResync();
        } else if (record.status === "pending") {
          onMessage(record.message, "info");
          scheduleBalanceResync();
        } else {
          onMessage(record.error, "error");
        }
      } else {
        const broadcast = await broadcastSupportOperation(
          username,
          buildHiveTransferOp({
            from: username,
            to: DONATION_ACCOUNT,
            amount: parsedAmount,
            currency,
          }),
          "active"
        );

        if (!broadcast.success || !broadcast.txId) {
          onMessage(broadcast.error ?? "Donation broadcast failed", "error");
          return;
        }

        const record = await recordHiveTransferDonation({
          txId: broadcast.txId,
          currency,
          amount: parsedAmount,
        });

        if (record.status === "success" || record.status === "already_recorded") {
          applyOptimisticBalance(parsedAmount);
          setAmount("");
          setAmountError(null);
          onMessage(
            `Thank you. ${parsedAmount.toFixed(decimals)} ${currency} was sent to ${DONATION_ACCOUNT}.`,
            "success"
          );
          scheduleBalanceResync();
        } else if (record.status === "pending") {
          onMessage(record.message, "info");
          scheduleBalanceResync();
        } else {
          onMessage(record.error, "error");
        }
      }
    } finally {
      setPending(false);
    }
  };

  const balanceLabel = useMemo(() => {
    if (!username) return "Log in to see your balance";
    if (loadingBalances) return "Loading balance...";
    if (selectedBalance === null) return "Balance unavailable";
    return `Balance: ${selectedBalance.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })} ${currency}`;
  }, [username, loadingBalances, selectedBalance, decimals, currency]);

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
                <IconButton size="small" onClick={refreshBalances} disabled={refreshing}>
                  {refreshing ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
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
                onChange={handleCurrencyChange}
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
              onChange={(event) => handleAmountChange(event.target.value)}
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
                  onClick={openConfirm}
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
