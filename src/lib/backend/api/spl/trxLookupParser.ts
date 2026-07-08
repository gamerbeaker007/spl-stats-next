import type {
  LookupTransactionStatus,
  SplTransactionLookupInfo,
  SplTransactionLookupResponse,
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
