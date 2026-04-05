/**
 * Portfolio data computation service.
 * Fetches all data sources and computes a PortfolioData snapshot for one account.
 *
 * Architecture note: this file lives in scripts/lib/service/ and may import
 * from src/lib/backend/ (worker-safe) but must NOT import Next.js runtime APIs.
 */

import {
  calculateDECSPSPoolValue,
  fetchHETokenPriceHive,
} from "@/lib/backend/api/hive-engine/hive-engine-api";
import { fetchPeakmonstersMarketPrices } from "@/lib/backend/api/peakmonsters/peakmonsters-api";
import {
  fetchCardCollection,
  fetchListingPrices,
  fetchPlayerBalances,
  fetchSplPrices,
} from "@/lib/backend/api/spl/spl-api";
import {
  fetchLandResourcePools,
  fetchMarketDeeds,
  fetchMarketLanding,
  fetchOwnedDeeds,
  fetchOwnedResource,
  fetchStakedDec,
  VapiDeed,
} from "@/lib/backend/api/spl/vapi-spl";
import { getPlayerCollectionValue } from "@/lib/collectionUtils";
import type {
  CollectionEditionDetail,
  DeedDetail,
  InventoryItemDetail,
  LandResourceDetail,
  PortfolioData,
} from "@/types/portfolio";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// LAND_SWAP_FEE: 10% swap fee applied when computing resource value via the land pool.
const LAND_SWAP_FEE = 0.9;

// ---------------------------------------------------------------------------
// Token balances & values
// ---------------------------------------------------------------------------

interface TokenResult {
  decValue: number;
  decQty: number;
  spsValue: number;
  spsQty: number;
  spspValue: number;
  spspQty: number;
  voucherValue: number;
  voucherQty: number;
  creditsValue: number;
  creditsQty: number;
  decBValue: number;
  decBQty: number;
  voucherGValue: number;
  voucherGQty: number;
  licenseValue: number;
  licenseQty: number;
}

async function computeTokenValues(
  username: string,
  decPriceUsd: number,
  spsPriceUsd: number,
  voucherPriceUsd: number,
  licensePriceUsd: number
): Promise<TokenResult> {
  const balances = await fetchPlayerBalances(username);

  const result: TokenResult = {
    decValue: 0,
    decQty: 0,
    spsValue: 0,
    spsQty: 0,
    spspValue: 0,
    spspQty: 0,
    voucherValue: 0,
    voucherQty: 0,
    creditsValue: 0,
    creditsQty: 0,
    decBValue: 0,
    decBQty: 0,
    voucherGValue: 0,
    voucherGQty: 0,
    licenseValue: 0,
    licenseQty: 0,
  };

  for (const bal of balances) {
    const { token, balance: qty } = bal;
    if (qty <= 0) continue;

    // --- Assign to named column with direct price lookup ---
    switch (token) {
      case "DEC":
        result.decQty += qty;
        result.decValue += qty * decPriceUsd;
        break;
      case "SPS":
        result.spsQty += qty;
        result.spsValue += qty * spsPriceUsd;
        break;
      case "SPSP":
        // Staked SPS — priced at SPS rate
        result.spspQty += qty;
        result.spspValue += qty * spsPriceUsd;
        break;
      case "VOUCHER": {
        result.voucherQty += qty;
        result.voucherValue += qty * voucherPriceUsd;
        break;
      }
      case "CREDITS":
        result.creditsQty += qty;
        result.creditsValue += qty * 0.001; // fixed: 1 credit = $0.001
        break;
      case "DEC-B": {
        result.decBQty += qty;
        result.decBValue += qty * decPriceUsd;
        break;
      }
      case "VOUCHER-G": {
        result.voucherGQty += qty;
        result.voucherGValue += qty * voucherPriceUsd;
        break;
      }
      case "LICENSE":
      case "ACTIVATED_LICENSE":
        // RUNNING_LICENSE is a status flag — a running license is already counted
        // as ACTIVATED_LICENSE. Summing both would double-count the same physical license.
        result.licenseQty += qty;
        result.licenseValue += qty * licensePriceUsd;
        break;
      case "RUNNING_LICENSE":
        // Skip: subset indicator of activated licenses. Not a separate asset.
        break;
      default: {
        //TODO ideally we would have a more robust way to identify no-value tokens vs real tokens missing from price map (e.g. via token metadata or a curated list)
        console.debug(`Token ${token} is not a recognized token...`);
        break;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Land deeds
// ---------------------------------------------------------------------------

function deedGroupKey(deed: VapiDeed): string {
  return `${deed.rarity}|${deed.plot_status}|${deed.magic_type}|${deed.deed_type}`;
}

interface DeedsResult {
  deedsValue: number;
  deedsQty: number;
  deedDetails: DeedDetail[];
}

// Filter attributes applied in order — mirrors Python's progressive fallback.
const DEED_FILTER_ATTRS = ["rarity", "plot_status", "magic_type", "deed_type"] as const;
type DeedFilterAttr = (typeof DEED_FILTER_ATTRS)[number];

/**
 * Find the minimum market listing price for a deed using progressive fallback.
 *
 * Mirrors the Python logic: for each attribute in order, narrow the candidate
 * listings. If narrowing would empty the set, skip that attribute (keep the
 * broader set) and log a warning. Returns 0 if the market is empty.
 */
function findBestMarketPrice(deed: VapiDeed, market: VapiDeed[]): number {
  if (market.length === 0) return 0;

  let candidates = market;
  const missingAttrs: DeedFilterAttr[] = [];

  for (const attr of DEED_FILTER_ATTRS) {
    const deedVal = deed[attr];
    const narrowed = candidates.filter((m) =>
      deedVal == null || deedVal === "" ? m[attr] == null || m[attr] === "" : m[attr] === deedVal
    );
    if (narrowed.length > 0) {
      candidates = narrowed;
    } else {
      missingAttrs.push(attr);
    }
  }

  if (missingAttrs.length > 0) {
    const attrs = DEED_FILTER_ATTRS.map((a) => `${a}: ${deed[a]}`).join(", ");
    console.warn(
      `Deed price: no exact match — relaxed filters [${missingAttrs.join(", ")}] for deed (${attrs})`
    );
  }

  const validPrices = candidates
    .map((m) => m.listing_price)
    .filter((p): p is number => p != null && p > 0);

  return validPrices.length > 0 ? Math.min(...validPrices) : 0;
}

function computeDeedValues(owned: VapiDeed[], market: VapiDeed[]): DeedsResult {
  if (owned.length === 0) {
    return { deedsValue: 0, deedsQty: 0, deedDetails: [] };
  }

  // Pre-filter market to valid listings only (non-null, positive price).
  const validMarket = market.filter((m) => m.listing_price != null && m.listing_price > 0);

  // Count owned deeds by group key (all 4 attributes).
  const countByGroup = new Map<string, { deed: VapiDeed; count: number }>();
  for (const deed of owned) {
    const key = deedGroupKey(deed);
    const entry = countByGroup.get(key);
    if (entry) {
      entry.count++;
    } else {
      countByGroup.set(key, { deed, count: 1 });
    }
  }

  let totalValue = 0;
  const deedDetails: DeedDetail[] = [];

  for (const { deed, count } of countByGroup.values()) {
    const key = deedGroupKey(deed);
    const minListingUsd = findBestMarketPrice(deed, validMarket);
    const groupValue = count * minListingUsd;

    totalValue += groupValue;
    console.log(
      `Deed group ${key}: count=${count}, minListingPrice=$${minListingUsd}, groupValue=$${groupValue.toFixed(2)}`
    );
    deedDetails.push({
      rarity: deed.rarity,
      plotStatus: deed.plot_status,
      magicType: deed.magic_type,
      deedType: deed.deed_type,
      qty: count,
      minListingPrice: minListingUsd,
    });
  }

  return {
    deedsValue: totalValue,
    deedsQty: owned.length,
    deedDetails,
  };
}

// ---------------------------------------------------------------------------
// Land resources
// ---------------------------------------------------------------------------

interface LandResourcesResult {
  landResourceValue: number;
  landResourceQty: number;
  landResourceDetailed: LandResourceDetail[];
}

async function computeLandResourceValues(
  username: string,
  decPriceUsd: number,
  shouldStop: () => boolean
): Promise<LandResourcesResult> {
  const pools = await fetchLandResourcePools();

  let totalValue = 0;
  let totalQty = 0;
  const detailed: LandResourceDetail[] = [];

  for (const pool of pools) {
    if (shouldStop()) break;

    const qty = await fetchOwnedResource(username, pool.token_symbol);
    if (qty <= 0) continue;

    const value = qty * pool.resource_price * LAND_SWAP_FEE * decPriceUsd;
    totalValue += value;
    totalQty += qty;
    detailed.push({ resource: pool.token_symbol, qty, value });
  }

  return {
    landResourceValue: totalValue,
    landResourceQty: totalQty,
    landResourceDetailed: detailed,
  };
}

// ---------------------------------------------------------------------------
// Main computation entry point
// ---------------------------------------------------------------------------

/**
 * Compute a full portfolio snapshot for one account.
 * Pass a `shouldStop` callback — if it returns true mid-fetch, the function
 * returns null so the caller can abort without writing partial data.
 */
export async function computePortfolioData(
  username: string,
  shouldStop: () => boolean
): Promise<PortfolioData | null> {
  // ── Step 1: prices ───────────────────────────────────────────────────────
  if (shouldStop()) return null;
  const [prices, licensePriceHive] = await Promise.all([
    fetchSplPrices(),
    fetchHETokenPriceHive("LICENSE"),
  ]);
  const hivePriceUsd = prices.hive ?? 0;
  const decPriceUsd = prices.dec ?? 0;
  const spsPriceUsd = prices.sps ?? 0;
  const voucherPriceUsd = prices.voucher ?? 0;
  const licensePriceUsd = licensePriceHive * hivePriceUsd;

  // ── Step 2: collection + market landing asset prices ─────────────────────
  if (shouldStop()) return null;
  const [collectionRaw, listingPricesRaw, pkmPricesRaw, marketLandingAssets] = await Promise.all([
    fetchCardCollection(username),
    fetchListingPrices(),
    fetchPeakmonstersMarketPrices(),
    fetchMarketLanding(username),
  ]);

  const collectionVal = await getPlayerCollectionValue(
    collectionRaw,
    listingPricesRaw,
    pkmPricesRaw
  );
  console.log(`Computed collection value: $${collectionVal.totalMarketValue.toFixed(2)}`);

  const collectionDetails: CollectionEditionDetail[] = Object.entries(collectionVal.editionValues)
    .filter(([, vals]) => vals.numberOfCards > 0)
    .map(([editionKey, vals]) => {
      const edition = parseInt(editionKey);
      return {
        edition,
        listValue: vals.listValue,
        marketValue: vals.marketValue,
        bcx: vals.bcx,
        numberOfCards: vals.numberOfCards,
      };
    })
    .sort((a, b) => a.edition - b.edition);
  const collectionResult = {
    collectionMarketValue: collectionVal.totalMarketValue,
    collectionListValue: collectionVal.totalListValue,
    collectionDetails,
  };

  // ── Step 3: token balances ───────────────────────────────────────────────
  if (shouldStop()) return null;
  const tokenResult = await computeTokenValues(
    username,
    decPriceUsd,
    spsPriceUsd,
    voucherPriceUsd,
    licensePriceUsd
  );

  // ── Step 4: staked DEC ───────────────────────────────────────────────────
  if (shouldStop()) return null;
  const decStakedQty = await fetchStakedDec(username);
  const decStakedValue = decStakedQty * decPriceUsd;

  // ── Step 5: land deeds (can be slow — paginated market fetch) ───────────
  if (shouldStop()) return null;
  const [ownedDeeds, marketDeeds] = await Promise.all([
    fetchOwnedDeeds(username),
    fetchMarketDeeds(),
  ]);
  if (shouldStop()) return null;
  const deedsResult = computeDeedValues(ownedDeeds, marketDeeds);

  // ── Step 6: land resources ───────────────────────────────────────────────
  if (shouldStop()) return null;
  const landResult = await computeLandResourceValues(username, decPriceUsd, shouldStop);

  // ── Step 7: liquidity pool ───────────────────────────────────────────────
  if (shouldStop()) return null;
  const liqResult = await calculateDECSPSPoolValue(username, decPriceUsd, spsPriceUsd);

  // ── Step 8: inventory ───────────────────────────────────────────────────
  // Market landing already includes numOwned per asset — no extra API call needed.
  if (shouldStop()) return null;
  const inventoryDetail: InventoryItemDetail[] = [];
  let inventoryValue = 0;
  let inventoryQty = 0;

  for (const asset of marketLandingAssets) {
    if (asset.numOwned <= 0) continue;
    //Filter out assetName DEEDS when not detailName=Unsurveyed Deed
    if (asset.assetName === "DEEDS" && asset.detailName !== "Unsurveyed Deed") continue;
    const price = asset.prices[0]?.minPrice ?? 0;
    const value = asset.numOwned * price;
    inventoryValue += value;
    inventoryQty += asset.numOwned;
    inventoryDetail.push({
      name: asset.detailName,
      assetName: asset.assetName,
      qty: asset.numOwned,
      value,
    });
  }

  // ── Assemble ─────────────────────────────────────────────────────────────
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return {
    date: today,
    username,

    ...collectionResult,
    ...tokenResult,

    decStakedQty,
    decStakedValue,

    ...deedsResult,
    ...landResult,

    liqPoolDecQty: liqResult.decQty,
    liqPoolDecValue: liqResult.decValue,
    liqPoolSpsQty: liqResult.spsQty,
    liqPoolSpsValue: liqResult.spsValue,

    inventoryValue,
    inventoryQty,
    inventoryDetail,

    decPriceUsd,
    hivePriceUsd,
    spsPriceUsd,
  };
}
