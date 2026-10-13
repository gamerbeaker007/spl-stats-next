/**
 * Authenticated SPL VAPI calls (LAND).
 *
 * All functions in this module require a valid JWT token obtained from the SPL
 * login endpoint. The JWT is sent as an Authorization: Bearer header instead of
 * a query parameter, following the SPL team's recommendation to use JWT-based
 * authentication rather than long-lived game tokens.
 *
 * Public (unauthenticated) Land API calls remain in vapi-spl.ts.
 */

import logger from "@/lib/backend/log/logger.server";
import { splApiConfig } from "@/lib/shared/config/splApiConfig";
import { SPL_VAPI } from "@/lib/shared/config/spl-endpoints";
import axios, { AxiosRequestConfig } from "axios";
import * as rax from "retry-axios";
import { splRetryConfig } from "@/lib/backend/api/spl/spl-retry";

const SPL_USER_AGENT = process.env.SPL_USER_AGENT ?? "spl-stats-instance/1.0";

const splLandAuthClient = axios.create({
  baseURL: splApiConfig.vapiBaseUrl,
  timeout: 60000,
  headers: {
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "User-Agent": SPL_USER_AGENT,
  },
});

rax.attach(splLandAuthClient);
splLandAuthClient.defaults.raxConfig = splRetryConfig("[auth] ");

/** Build Axios config that injects the JWT as a Bearer token. */
function bearerConfig(jwtToken: string, extra?: AxiosRequestConfig): AxiosRequestConfig {
  return {
    ...extra,
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      ...extra?.headers,
    },
  };
}

// ---------------------------------------------------------------------------
// Land harvest
// ---------------------------------------------------------------------------

export interface VapiLandRegion {
  name: string;
  region_number: number;
  region_uid?: string;
  last_claimed?: string | null;
}

interface VapiLandProductionOverviewResponse {
  data: {
    regions: {
      items: VapiLandRegion[];
    };
  };
}

/** Fetch per-region last_claimed timestamps from the land production overview. */
export async function fetchLandProductionOverview(
  player: string,
  jwtToken: string
): Promise<VapiLandRegion[]> {
  try {
    const res = await splLandAuthClient.get<VapiLandProductionOverviewResponse>(
      SPL_VAPI.LAND_RESOURCES_PRODUCTION_OVERVIEW,
      bearerConfig(jwtToken, { params: { player } })
    );
    return res.data?.data?.regions?.items ?? [];
  } catch (error) {
    logger.error(
      `vapi: fetchLandProductionOverview(${player}): ${error instanceof Error ? error.message : error}`
    );
    throw error;
  }
}
