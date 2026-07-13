"use client";

import type { TxProgressState } from "@/components/shared/TransactionProgressPanel";
import { waitForTransactions } from "@/lib/frontend/purchase/splBroadcast";
import { useCallback, useState } from "react";

interface RunTxOptions {
  /** Short label shown in the progress panel (e.g. "List", "Transfer"). */
  label: string;
  /** Status message shown while the tx is broadcasting. */
  message: string;
  /** Build + broadcast the tx; resolves to the broadcast tx id. */
  execute: () => Promise<string>;
  /** Runs after the tx verifies successfully (e.g. refresh a local list). */
  onVerified?: () => void | Promise<void>;
}

/**
 * Owns the shared marketplace write-flow: busy/progress/error state plus the
 * broadcast → wait-for-verification → onCompleted sequence. Dialogs only supply
 * what to broadcast, removing the ~25-line boilerplate that was repeated in every
 * buy/list/transfer/delist handler.
 */
export function useMarketplaceTransaction(onCompleted: () => void | Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [txProgress, setTxProgress] = useState<TxProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async ({ label, message, execute, onVerified }: RunTxOptions) => {
      setBusy(true);
      setError(null);

      try {
        setTxProgress({ status: "processing", label, message });
        const txId = await execute();
        setTxProgress({ status: "processing", label, txId });

        const [confirmation] = await waitForTransactions([txId]);
        if (confirmation?.status.success) {
          setTxProgress({ status: "verified", txId, label });
          await onCompleted();
          await onVerified?.();
        } else {
          setTxProgress({
            status: "error",
            txId,
            label,
            error: confirmation?.status.message ?? "Transaction was not verified.",
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to ${label.toLowerCase()}`;
        setError(message);
        setTxProgress({ status: "error", label, error: message });
      } finally {
        setBusy(false);
      }
    },
    [onCompleted]
  );

  const reset = useCallback(() => {
    setBusy(false);
    setTxProgress(null);
    setError(null);
  }, []);

  return { busy, txProgress, error, run, reset };
}
