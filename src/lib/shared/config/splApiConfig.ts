export type SplApiMode = "production" | "test";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function currentMode(): SplApiMode {
  if (process.env.NEXT_PUBLIC_SPL_DEV_API === "true") return "test";
  const raw = (process.env.SPL_API_MODE ?? "production").trim().toLowerCase();
  return raw === "test" ? "test" : "production";
}

const mode = currentMode();

const APP = `${process.env.NEXT_PUBLIC_APP_NAME ?? "spl-stats-next"}/${process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}`;

export const splApiConfig = {
  mode,
  publicBaseUrl: trimTrailingSlash(
    process.env.SPL_API_BASE_URL ??
      (mode === "test"
        ? (process.env.SPL_TEST_API_BASE_URL ?? "https://api.mavs-sl.com")
        : "https://api.splinterlands.com")
  ),
  vapiBaseUrl: trimTrailingSlash(
    process.env.SPL_VAPI_BASE_URL ??
      (mode === "test"
        ? (process.env.SPL_TEST_VAPI_BASE_URL ?? "https://vapi.mavs-sl.com")
        : "https://vapi.splinterlands.com")
  ),
  app: APP,
  operationPrefix:
    process.env.SPL_OPERATION_PREFIX ??
    (mode === "test" ? (process.env.SPL_TEST_OPERATION_PREFIX ?? "sl-mavs") : ""),
};

export function withOperationPrefix(operationId: string): string {
  const prefix = splApiConfig.operationPrefix?.trim();
  if (!prefix) return operationId;
  return `${prefix}${operationId}`;
}
