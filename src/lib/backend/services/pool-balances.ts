import { calculateDECSPSPoolValue as calculateDECSPSPoolValueHE } from "@/lib/backend/api/hive-engine/hive-engine-api";
import { calculateDECSPSPoolValue as calculateDECSPSPoolValueInGame } from "@/lib/backend/api/spl/vapi-spl";
import logger from "@/lib/backend/log/logger.server";
import { PlayerPoolBalances } from "@/types/spl/balances";

const EMPTY_POOL_BALANCES: PlayerPoolBalances = {
  inGameDecQty: 0,
  inGameSpsQty: 0,
  heDecQty: 0,
  heSpsQty: 0,
  decQty: 0,
  spsQty: 0,
};

/**
 * A player's underlying DEC/SPS across both DEC-SPS liquidity pools.
 *
 * Reuses the exact same pool-share math the portfolio snapshot uses
 * (`calculateDECSPSPoolValue` for in-game vAPI and for Hive Engine). USD prices
 * are irrelevant here — the dashboard shows quantities — so `0` is passed and
 * only the `*Qty` fields are read.
 *
 * A failure on either side degrades to `0` for that source instead of failing
 * the whole lookup, mirroring the portfolio behaviour.
 */
export async function getPlayerPoolBalances(username: string): Promise<PlayerPoolBalances> {
  const normalized = username.trim().toLowerCase();

  const [inGame, he] = await Promise.allSettled([
    calculateDECSPSPoolValueInGame(normalized, 0, 0),
    calculateDECSPSPoolValueHE(normalized, 0, 0),
  ]);

  if (inGame.status === "rejected") {
    logger.warn(
      `pool-balances: in-game DEC-SPS pool lookup failed for ${normalized}: ${
        inGame.reason instanceof Error ? inGame.reason.message : inGame.reason
      }`
    );
  }
  if (he.status === "rejected") {
    logger.warn(
      `pool-balances: Hive Engine DEC-SPS pool lookup failed for ${normalized}: ${
        he.reason instanceof Error ? he.reason.message : he.reason
      }`
    );
  }

  if (inGame.status === "rejected" && he.status === "rejected") {
    return EMPTY_POOL_BALANCES;
  }

  const inGameDecQty = inGame.status === "fulfilled" ? inGame.value.decQty : 0;
  const inGameSpsQty = inGame.status === "fulfilled" ? inGame.value.spsQty : 0;
  const heDecQty = he.status === "fulfilled" ? he.value.decQty : 0;
  const heSpsQty = he.status === "fulfilled" ? he.value.spsQty : 0;

  return {
    inGameDecQty,
    inGameSpsQty,
    heDecQty,
    heSpsQty,
    decQty: inGameDecQty + heDecQty,
    spsQty: inGameSpsQty + heSpsQty,
  };
}
