import { getPlayerBrawl, getPlayerPoolBalances } from "@/lib/backend/actions/player-actions";
import {
  fetchAccountBalances,
  fetchLandResourcePools,
  fetchPlayerDetails,
  fetchPlayerDraws,
  fetchStakedDEC,
} from "@/lib/frontend/spl-browser-api";
import { toSectionAuthState } from "@/lib/shared/authenticated-result";
import { PlayerStatusData } from "@/types/playerStatus";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UsePlayerStatusOptions {
  enabled?: boolean;
  includeBrawl?: boolean;
}

export interface UsePlayerStatusReturn {
  data: PlayerStatusData | null;
  loading: boolean;
  error: string | null;
  fetchPlayerStatus: (username: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePlayerStatus(
  username: string,
  options?: UsePlayerStatusOptions
): UsePlayerStatusReturn {
  const enabled = options?.enabled ?? true;
  const includeBrawl = options?.includeBrawl ?? true;
  const [data, setData] = useState<PlayerStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchPlayerStatus = useCallback(async () => {
    if (!enabled) return;
    // Don't fetch if username is invalid
    if (!username || !username.trim()) {
      setError("Invalid username");
      setData(null);
      return;
    }

    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const [
        balancesResult,
        drawsResult,
        detailsResult,
        poolBalancesResult,
        stakedDecResult,
        landResourcePoolsResult,
      ] = await Promise.allSettled([
        fetchAccountBalances(username),
        fetchPlayerDraws(username),
        fetchPlayerDetails(username),
        getPlayerPoolBalances(username),
        fetchStakedDEC(username),
        fetchLandResourcePools(),
      ]);

      if (!isMountedRef.current) return;

      const result: PlayerStatusData = {
        username,
        timestamp: new Date().toISOString(),
      };

      if (balancesResult.status === "fulfilled") {
        result.balances = balancesResult.value;

        if (landResourcePoolsResult.status === "fulfilled") {
          let totalValue = 0;
          for (const pool of landResourcePoolsResult.value) {
            if (pool.token_symbol === "SPS") continue; // SPS is not a land resource, skip
            const balanceEntry = result.balances.find(
              (b) => b.token === "DEC-" + pool.token_symbol
            );
            if (balanceEntry) {
              const totalShares = Number(pool.total_shares ?? 0);
              const shares = balanceEntry.balance ?? 0; // shares
              const ownership = totalShares > 0 && shares > 0 ? shares / totalShares : 0;
              const decQuantity = Number(pool.dec_quantity ?? 0);
              const poolDecQty = ownership > 0 ? decQuantity * ownership : 0;
              totalValue += poolDecQty;
            }
          }
          result.tradeHubDecBalance = totalValue;
        } else {
          result.tradeHubDecBalanceError =
            landResourcePoolsResult.reason instanceof Error
              ? landResourcePoolsResult.reason.message
              : "Failed to fetch land resource pools";
        }
      } else {
        result.balancesError =
          balancesResult.reason instanceof Error
            ? balancesResult.reason.message
            : "Failed to fetch balances";
      }

      if (poolBalancesResult.status === "fulfilled") {
        result.poolBalances = poolBalancesResult.value;
      } else {
        result.poolBalancesError =
          poolBalancesResult.reason instanceof Error
            ? poolBalancesResult.reason.message
            : "Failed to fetch pool balances";
      }

      if (stakedDecResult.status === "fulfilled") {
        result.stakedDec = stakedDecResult.value;
      } else {
        result.stakedDecError =
          stakedDecResult.reason instanceof Error
            ? stakedDecResult.reason.message
            : "Failed to fetch land-staked DEC";
      }

      if (drawsResult.status === "fulfilled") {
        result.draws = drawsResult.value;
      } else {
        result.drawsError =
          drawsResult.reason instanceof Error
            ? drawsResult.reason.message
            : "Failed to fetch draws";
      }

      if (detailsResult.status === "fulfilled") {
        result.playerDetails = detailsResult.value;
      } else {
        result.detailsError =
          detailsResult.reason instanceof Error
            ? detailsResult.reason.message
            : "Failed to fetch player details";
      }

      if (isMountedRef.current) {
        setData(result);
      }

      // Fetch brawl details separately if player has a guild
      // This runs as its own server action to avoid timeout on the details call
      if (includeBrawl && detailsResult.status === "fulfilled" && detailsResult.value.guild?.id) {
        const guild = detailsResult.value.guild;
        try {
          const brawl = await getPlayerBrawl(username, guild.id, guild.tournament_id);
          if (isMountedRef.current) {
            // `partial` = the public brawl response: cycle/status/battles are
            // real, only fray selection needs a token. Keep the data AND flag it.
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    brawlDetails:
                      brawl.status === "ok" || brawl.status === "partial" ? brawl.data : undefined,
                    brawlAuthState: toSectionAuthState(brawl) ?? undefined,
                    brawlError: brawl.status === "error" ? brawl.message : undefined,
                  }
                : prev
            );
          }
        } catch (err) {
          // Non-critical: surface it on the card instead of swallowing it.
          if (isMountedRef.current) {
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    brawlError:
                      err instanceof Error ? err.message : "Failed to fetch brawl details",
                  }
                : prev
            );
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch player status";
      if (isMountedRef.current) {
        setError(errorMessage);
        setData(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [username, enabled, includeBrawl]);

  const refetch = useCallback(async () => {
    await fetchPlayerStatus();
  }, [fetchPlayerStatus]);

  // Auto-fetch on mount (only if username is valid)
  useEffect(() => {
    isMountedRef.current = true;

    if (username && username.trim()) {
      fetchPlayerStatus();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [username, fetchPlayerStatus]);

  return {
    data,
    loading,
    error,
    fetchPlayerStatus,
    refetch,
  };
}
