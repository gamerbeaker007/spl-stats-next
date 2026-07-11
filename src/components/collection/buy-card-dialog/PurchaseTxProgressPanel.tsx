import { Alert, CircularProgress, Link, Stack, Typography } from "@mui/material";
import { LuExternalLink } from "react-icons/lu";
import { MdCheckCircle } from "react-icons/md";

export interface TxProgressState {
  status: "processing" | "verified" | "error";
  label?: string;
  message?: string;
  txId?: string;
  error?: string;
}

interface PurchaseTxProgressPanelProps {
  txProgress: TxProgressState | null;
}

function txLink(txId: string): string {
  return `https://hivehub.dev/tx/${encodeURIComponent(txId)}`;
}

export default function PurchaseTxProgressPanel({
  txProgress,
}: Readonly<PurchaseTxProgressPanelProps>) {
  if (!txProgress) return null;

  return (
    <Stack spacing={0.75} sx={{ minWidth: 260 }}>
      {txProgress.label && (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
          {txProgress.label}
        </Typography>
      )}

      {txProgress.status === "processing" && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">Processing transaction...</Typography>
        </Stack>
      )}

      {txProgress.status === "verified" && (
        <Stack spacing={0.5} direction="row" alignItems="center">
          <MdCheckCircle color="#2e7d32" />
          <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>
            Transaction verified
          </Typography>
          {txProgress.txId && (
            <Link href={txLink(txProgress.txId)} target="_blank" rel="noopener noreferrer">
              <LuExternalLink />
            </Link>
          )}
        </Stack>
      )}

      {txProgress.status === "error" && (
        <Alert severity="error">
          {txProgress.error ?? txProgress.message ?? "Transaction failed"}
        </Alert>
      )}

      {txProgress.message && txProgress.status !== "error" && (
        <Typography variant="caption" color="text.secondary">
          {txProgress.message}
        </Typography>
      )}

      {txProgress.txId && txProgress.status !== "verified" && (
        <Typography variant="caption" color="text.secondary">
          Tx: {txProgress.txId}
        </Typography>
      )}
    </Stack>
  );
}
