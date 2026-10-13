import {
  type CheapestListingSelection,
  priceSelectionInCurrency,
} from "@/lib/shared/marketplace-assets";
import { buildMarketplacePurchasePayload } from "@/lib/shared/transactions-builder";
import type { PurchaseCurrency } from "@/types/purchase/purchase-plan";
import type { SplBalance } from "@/types/spl/balances";

/**
 * Allowed drift between the DEC rate quoted here and the one SPL applies at
 * execution. DEC estimates are padded by this much and it is broadcast as
 * `dec_mismatch_percent`, so a small rate move does not fail the purchase.
 */
export const DEC_MISMATCH_PERCENT = 1.5;

/** Liquid balance of one token (0 when absent). Staked DEC-B is a separate token. */
export function tokenBalance(balances: SplBalance[], token: string): number {
  return balances.find((entry) => entry.token === token)?.balance ?? 0;
}

function applyPercentBuffer(amount: number, percent: number): number {
  return Number((amount * (1 + percent / 100)).toFixed(3));
}

/**
 * Turn a USD listing selection into a signed-ready `sm_marketplace_purchase`
 * payload: converts to the payment currency at the live DEC rate, pads DEC
 * estimates by `DEC_MISMATCH_PERCENT`, and verifies the buyer can afford it.
 * Shared by every `sm_marketplace_purchase` flow (assets and land deeds).
 */
export function buildPricedMarketplacePurchase(args: {
  selection: CheapestListingSelection;
  currency: PurchaseCurrency;
  decPriceUsd: number;
  balances: SplBalance[];
}) {
  const priced = priceSelectionInCurrency(args.selection, args.currency, args.decPriceUsd);
  if (!priced) {
    throw new Error(`Could not price this purchase in ${args.currency}`);
  }

  const transmitPriced =
    args.currency === "DEC"
      ? {
          items: priced.items.map((item) => ({
            ...item,
            estimatedCost: applyPercentBuffer(item.estimatedCost, DEC_MISMATCH_PERCENT),
          })),
          totalCost: applyPercentBuffer(priced.totalCost, DEC_MISMATCH_PERCENT),
        }
      : priced;

  const availableBalance = tokenBalance(args.balances, args.currency);
  if (availableBalance < transmitPriced.totalCost) {
    throw new Error(`Insufficient ${args.currency}`);
  }

  const payloadArgs: Parameters<typeof buildMarketplacePurchasePayload>[0] = {
    items: transmitPriced.items,
  };

  if (args.currency === "DEC") {
    payloadArgs.expectedDecPrice = args.decPriceUsd;
    payloadArgs.decMismatchPercent = DEC_MISMATCH_PERCENT;
  }

  return {
    payload: buildMarketplacePurchasePayload(payloadArgs),
    estimatedCost: priced.totalCost,
    availableBalance,
  };
}
