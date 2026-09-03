import { DONATION_MEMO } from "@/constants/support";
import { getAppName, getNonce } from "@/lib/shared/transactions-builder";

type HiveOperation = [string, object];

function buildActiveCustomJsonOp(username: string, id: string, payload: object): HiveOperation {
  return [
    "custom_json",
    {
      required_auths: [username.toLowerCase()],
      required_posting_auths: [],
      id,
      json: JSON.stringify(payload),
    },
  ];
}

export function buildApproveValidatorOp(username: string, validatorName: string): HiveOperation {
  return buildActiveCustomJsonOp(username, "sm_approve_validator", {
    account_name: validatorName.toLowerCase(),
    app: getAppName(),
    n: getNonce(),
  });
}

export function buildUnapproveValidatorOp(username: string, validatorName: string): HiveOperation {
  return buildActiveCustomJsonOp(username, "sm_unapprove_validator", {
    account_name: validatorName.toLowerCase(),
    app: getAppName(),
    n: getNonce(),
  });
}

export function buildTokenTransferOp(args: {
  username: string;
  token: "DEC" | "SPS";
  to: string;
  qty: number;
}): HiveOperation {
  return buildActiveCustomJsonOp(args.username, "sm_token_transfer", {
    token: args.token,
    to: args.to.toLowerCase(),
    qty: args.qty,
    memo: DONATION_MEMO,
    app: getAppName(),
    n: getNonce(),
  });
}

export function buildHiveTransferOp(args: {
  from: string;
  to: string;
  amount: number;
  currency: "HIVE" | "HBD";
}): ["transfer", { from: string; to: string; amount: string; memo: string }] {
  return [
    "transfer",
    {
      from: args.from.toLowerCase(),
      to: args.to.toLowerCase(),
      amount: `${args.amount.toFixed(3)} ${args.currency}`,
      memo: DONATION_MEMO,
    },
  ];
}
