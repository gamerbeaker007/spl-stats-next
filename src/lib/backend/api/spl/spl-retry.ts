import logger from "@/lib/backend/log/logger.server";
import axios from "axios";
import * as rax from "retry-axios";

/**
 * Wait before each retry, in ms: 5s, 10s, 20s, 30s, 1m, 2m, 4m, 8m50s.
 * 8 retries, ~17 min total — the same budget as the old 10-retry exponential
 * backoff (0.5s … 511.5s), but front-loaded so short 429 bursts recover in
 * seconds instead of hammering SPL with sub-second retries.
 * A `Retry-After` header from SPL still takes precedence (retry-axios default).
 */
const SPL_RETRY_SCHEDULE_MS = [5_000, 10_000, 20_000, 30_000, 60_000, 120_000, 240_000, 530_000];

/**
 * retry-axios config shared by the SPL api/auth clients.
 *
 * retry-axios has no per-attempt delay list, so it runs in `static` mode and
 * `onRetryAttempt` (which fires right before the retried request) sets the
 * `retryDelay` for the *next* failure. The raxConfig object it mutates is the
 * one carried on the retried request, so the next attempt reads it.
 */
export function splRetryConfig(logPrefix = ""): rax.RetryConfig {
  return {
    retry: SPL_RETRY_SCHEDULE_MS.length,
    retryDelay: SPL_RETRY_SCHEDULE_MS[0],
    backoffType: "static",
    statusCodesToRetry: [
      [429, 429],
      [500, 599],
    ],
    onRetryAttempt: async (err) => {
      const cfg = rax.getConfig(err);
      const attempt = cfg?.currentRetryAttempt ?? 0;
      if (cfg) {
        cfg.retryDelay = SPL_RETRY_SCHEDULE_MS[Math.min(attempt, SPL_RETRY_SCHEDULE_MS.length - 1)];
      }

      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as Record<string, unknown>)?.error ??
          err.response?.statusText ??
          err.message)
        : String(err);
      logger.warn(
        `${logPrefix}Retry attempt #${attempt}${status ? ` (HTTP ${status})` : ""}: ${msg}`
      );
    },
  };
}
