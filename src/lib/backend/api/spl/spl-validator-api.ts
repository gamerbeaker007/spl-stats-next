import logger from "@/lib/backend/log/logger.server";
import axios from "axios";
import * as rax from "retry-axios";

const validatorClient = axios.create({
  baseURL: "https://validator.spl-stats.com/",
  timeout: 12000,
  headers: {
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "User-Agent": process.env.SPL_USER_AGENT ?? "spl-stats-instance/1.0",
  },
});

rax.attach(validatorClient);
validatorClient.defaults.raxConfig = {
  retry: 3,
  retryDelay: 1000,
  backoffType: "exponential",
  statusCodesToRetry: [
    [429, 429],
    [500, 599],
  ],
};

export interface ValidatorVote {
  voter: string;
  validator: string;
  vote_weight: string;
}

export async function fetchValidatorVotesByAccount(account: string): Promise<ValidatorVote[]> {
  logger.info(`Fetching validator votes for ${account}`);
  const res = await validatorClient.get("/votes_by_account", {
    params: { account: account.toLowerCase() },
  });

  if (!Array.isArray(res.data)) {
    throw new Error("Invalid response from validator API");
  }

  return res.data as ValidatorVote[];
}
