/**
 * A player's underlying DEC/SPS held inside DEC-SPS liquidity pools.
 *
 * These quantities are *not* part of `/players/balances` — the in-game wallet
 * and the pool positions are separate holdings, so wallet + pool can be summed
 * without double-counting.
 */
export interface PlayerPoolBalances {
  /** In-game (vAPI, pool id 100) DEC-SPS position. */
  inGameDecQty: number;
  inGameSpsQty: number;
  /** Hive Engine `marketpools` DEC:SPS position. */
  heDecQty: number;
  heSpsQty: number;
  /** Combined in-game + Hive Engine totals. */
  decQty: number;
  spsQty: number;
}

export interface SplBalance {
  player: string;
  token: string;
  balance: number;
  last_update_date: string;
  last_reward_block: number;
  last_reward_time: string;
}
