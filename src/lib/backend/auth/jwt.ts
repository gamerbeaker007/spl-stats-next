import { decryptToken } from "@/lib/backend/auth/encryption";
import { getSplAccountCredentials } from "@/lib/backend/db/spl-accounts";

/**
 * Resolve and decrypt the stored SPL JWT for a monitored account.
 *
 * Server-only. Callers are responsible for the authorization check
 * (`assertMonitorsAccount`) before using the returned token.
 */
export async function getDecryptedJwt(username: string): Promise<string | undefined> {
  const creds = await getSplAccountCredentials(username);
  if (!creds) return undefined;
  return decryptToken(creds.encryptedToken, creds.iv, creds.authTag);
}
