import { Alert, Box, Stack, Typography } from "@mui/material";
import { MdCheckCircle, MdErrorOutline, MdRadioButtonUnchecked } from "react-icons/md";

interface TxProgressState {
  submitted: boolean;
  processed: boolean;
  txId?: string;
  error?: string;
}

interface PurchaseTxProgressPanelProps {
  buyBusy: boolean;
  txProgress: TxProgressState | null;
}

export default function PurchaseTxProgressPanel({
  buyBusy,
  txProgress,
}: Readonly<PurchaseTxProgressPanelProps>) {
  if (!txProgress && !buyBusy) return null;

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
      <Stack spacing={1}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {txProgress?.submitted ? (
            <MdCheckCircle color="#2e7d32" />
          ) : (
            <MdRadioButtonUnchecked color="#9e9e9e" />
          )}
          <Typography variant="body2">Transaction submitted (broadcast accepted)</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {txProgress?.processed ? (
            <MdCheckCircle color="#2e7d32" />
          ) : txProgress?.error ? (
            <MdErrorOutline color="#d32f2f" />
          ) : (
            <MdRadioButtonUnchecked color="#9e9e9e" />
          )}
          <Typography variant="body2">Transaction processed by Splinterlands</Typography>
        </Box>
        {txProgress?.txId && (
          <Typography variant="caption" color="text.secondary">
            Tx: {txProgress.txId}
          </Typography>
        )}
        {txProgress?.error && <Alert severity="error">{txProgress.error}</Alert>}
        {txProgress?.submitted && txProgress?.processed && (
          <Alert severity="success">Purchase confirmed successfully.</Alert>
        )}
      </Stack>
    </Box>
  );
}
