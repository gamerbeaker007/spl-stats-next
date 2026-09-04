import { DONATION_ACCOUNT, DONATION_MEMO, type DonationCurrency } from "@/constants/support";
import { buildTokenTransferPayload, getAppName, getNonce } from "@/lib/shared/transactions-builder";
import type { TokenTransferPayload } from "@/types/skin-transactions";

/** `sm_approve_validator` / `sm_unapprove_validator` share one payload shape. */
export interface ValidatorVotePayload {
  account_name: string;
  app: string;
  n: number;
}

export function buildValidatorVotePayload(validatorName: string): ValidatorVotePayload {
  return {
    account_name: validatorName.toLowerCase(),
    app: getAppName(),
    n: getNonce(),
  };
}

/** DEC/SPS donation: the shared token-transfer payload, with the donation memo. */
export function buildDonationTokenTransferPayload(
  token: Extract<DonationCurrency, "DEC" | "SPS">,
  amount: number
): TokenTransferPayload {
  return buildTokenTransferPayload({
    token,
    recipient: DONATION_ACCOUNT,
    quantity: amount,
    allowFractional: true,
    memo: DONATION_MEMO,
  });
}
