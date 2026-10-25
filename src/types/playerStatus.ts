import type { SectionAuthState } from "@/lib/shared/authenticated-result";
import { PlayerPoolBalances, SplBalance } from "@/types/spl/balances";
import { SplBrawlDetails } from "@/types/spl/brawl";
import { SplPlayerDetails } from "@/types/spl/details";
import { SplFrontierDrawStatus, SplRankedDrawStatus } from "@/types/spl/draws";

export interface PlayerStatusData {
  username: string;
  timestamp: string;
  balances?: SplBalance[];
  balancesError?: string;
  /** DEC/SPS held in DEC-SPS liquidity pools — additive to `balances`. */
  poolBalances?: PlayerPoolBalances;
  poolBalancesError?: string;
  /** DEC currently staked across the player's land plots. */
  stakedDec?: number;
  stakedDecError?: string;
  tradeHubDecBalance?: number;
  tradeHubDecBalanceError?: string;
  draws?: {
    frontier: SplFrontierDrawStatus;
    ranked: SplRankedDrawStatus;
  };
  drawsError?: string;
  playerDetails?: SplPlayerDetails;
  brawlDetails?: SplBrawlDetails;
  /** Set when the brawl response is the public one — fray selection is missing. */
  brawlAuthState?: SectionAuthState;
  brawlError?: string;
  detailsError?: string;
  error?: string;
}
