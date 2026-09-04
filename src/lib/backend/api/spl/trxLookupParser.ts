import type {
  LookupTransactionStatus,
  SplTransactionLookupInfo,
  SplTransactionLookupResponse,
  TokenTransferLookup,
} from "@/types/purchase/purchase-plan";

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return value;
  }
}

function isFailedObject(value: Record<string, unknown>): string | null {
  const error = value.error;
  const failed = value.failed;
  const success = value.success;

  if (typeof error === "string" && error.trim()) return error;
  if (failed === true) {
    const message = typeof value.message === "string" ? value.message : "Transaction failed";
    return message;
  }
  if (success === false) {
    const message = typeof value.message === "string" ? value.message : "Transaction failed";
    return message;
  }

  return null;
}

function parseLookupResult(trxInfo: SplTransactionLookupInfo) {
  return parseJson(trxInfo.result);
}

function resolveTrxInfoFailure(trxInfo: SplTransactionLookupInfo): string | null {
  if (typeof trxInfo.error === "string" && trxInfo.error.trim()) {
    return trxInfo.error;
  }

  if (trxInfo.failed === true || trxInfo.success === false) {
    if (typeof trxInfo.message === "string" && trxInfo.message.trim()) {
      return trxInfo.message;
    }
    return "Transaction failed";
  }

  return null;
}

export function lookupTransaction(
  rawLookup: SplTransactionLookupResponse
): LookupTransactionStatus {
  if (!rawLookup?.trx_info) {
    return {
      ok: true,
      resolved: false,
      success: false,
      message: "Transaction still processing",
      raw: rawLookup,
    };
  }

  const trxInfo = rawLookup.trx_info;
  const type = trxInfo.type;
  const directFailure = resolveTrxInfoFailure(trxInfo);
  if (directFailure) {
    return {
      ok: true,
      resolved: true,
      success: false,
      message: directFailure,
      type,
      raw: rawLookup,
    };
  }

  const parsedResult = parseLookupResult(trxInfo);

  if (parsedResult == null) {
    if (trxInfo.success === true) {
      return {
        ok: true,
        resolved: true,
        success: true,
        type,
        raw: rawLookup,
      };
    }

    return {
      ok: true,
      resolved: false,
      success: false,
      message: "Transaction still processing",
      type,
      raw: rawLookup,
    };
  }

  const resultObject =
    parsedResult && typeof parsedResult === "object"
      ? (parsedResult as Record<string, unknown>)
      : null;
  if (resultObject) {
    const failedMessage = isFailedObject(resultObject);
    if (failedMessage) {
      return {
        ok: true,
        resolved: true,
        success: false,
        message: failedMessage,
        type,
        raw: rawLookup,
      };
    }

    return {
      ok: true,
      resolved: true,
      success: true,
      type,
      raw: rawLookup,
    };
  }

  if (typeof parsedResult === "string") {
    const lowered = parsedResult.toLowerCase();
    if (lowered.includes("error") || lowered.includes("fail")) {
      return {
        ok: true,
        resolved: true,
        success: false,
        message: parsedResult,
        type,
        raw: rawLookup,
      };
    }
  }

  return {
    ok: true,
    resolved: true,
    success: true,
    type,
    raw: rawLookup,
  };
}

/**
 * Verifies a `sm_token_transfer` and returns what actually moved.
 *
 * `lookupTransaction` above only answers "did this transaction fail?", which is
 * all a purchase flow needs. A token transfer is different: callers record money
 * against it, so the amount, the two accounts and the token symbol have to come
 * back from the engine and be checked, and anything ambiguous has to be a hard
 * failure rather than a success. Hence a separate, stricter parser.
 *
 * `pending` means "ask again later" (not indexed, or no result yet); `failed`
 * means "never retry".
 */
export function parseTokenTransfer(
  rawLookup: SplTransactionLookupResponse | null
): TokenTransferLookup {
  const trxInfo = rawLookup?.trx_info;
  if (!trxInfo) return { status: "pending" };

  const directFailure = resolveTrxInfoFailure(trxInfo);
  if (directFailure) return { status: "failed", error: directFailure };

  // A different op broadcast under this trx id is not a transfer we can record.
  if (trxInfo.type !== "token_transfer") {
    return { status: "failed", error: `Unexpected transaction type: ${trxInfo.type}` };
  }

  const parsed = parseLookupResult(trxInfo);
  if (parsed == null) return { status: "pending" };
  if (typeof parsed !== "object") {
    return { status: "failed", error: "Could not parse transaction result" };
  }

  const result = parsed as Record<string, unknown>;
  const engineFailure = isFailedObject(result);
  if (engineFailure) return { status: "failed", error: engineFailure };

  const amount = Number(result.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: "failed", error: "Invalid transaction amount" };
  }

  // Guards against a result envelope belonging to a different transaction.
  const resultTrxId = typeof result.trx_id === "string" ? result.trx_id : null;
  if (resultTrxId && resultTrxId !== trxInfo.id) {
    return { status: "failed", error: "Transaction ID mismatch" };
  }

  const from = typeof result.from === "string" ? result.from : trxInfo.player;
  const to = typeof result.to === "string" ? result.to : "";
  const token = typeof result.token === "string" ? result.token : "";
  if (!from || !to || !token) {
    return {
      status: "failed",
      error: "Transaction is missing its sender, recipient, or token",
    };
  }

  const rawDate =
    typeof result.created_date === "string" ? result.created_date : trxInfo.created_date;
  const parsedDate = rawDate ? new Date(rawDate) : null;

  return {
    status: "success",
    transfer: {
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      token: token.toUpperCase(),
      amount,
      date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : new Date(),
    },
  };
}
