import { PeakmonstersMarketPriceEntry } from "@/types/peakmonsters/market";
import axios from "axios";
import * as rax from "retry-axios";

const pkmClient = axios.create({
  baseURL: "https://peakmonsters.com/api",
  timeout: 60000,
  headers: {
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "User-Agent": "SPL-Data/1.0",
  },
});

rax.attach(pkmClient);
pkmClient.defaults.raxConfig = {
  retry: 5,
  retryDelay: 1000,
  backoffType: "exponential",
  statusCodesToRetry: [
    [429, 429],
    [500, 599],
  ],
};

/** Fetch all card market prices from Peakmonsters. */
export async function fetchPeakmonstersMarketPrices(): Promise<PeakmonstersMarketPriceEntry[]> {
  const res = await pkmClient.get<{ prices: PeakmonstersMarketPriceEntry[] }>(
    "/market/cards/prices"
  );
  return res.data.prices ?? [];
}
