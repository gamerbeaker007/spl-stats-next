import { Client, cryptoUtils, Signature } from "@hiveio/dhive";

const HIVE_NODES = [
  "https://api.hive.blog",
  "https://api.deathwing.me",
  "https://api.openhive.network",
];

const hiveClient = new Client(HIVE_NODES, { timeout: 10_000 });

/**
 * Verify a Hive Keychain `signBuffer` signature against the account's posting public key.
 *
 * @param username  Hive username (lowercase)
 * @param message   The exact string that was signed (e.g. `"${username}${timestamp}"`)
 * @param signature Hex signature returned by Keychain
 * @returns true if the signature is valid for the account's posting key
 */
export async function verifyHiveSignature(
  username: string,
  message: string,
  signature: string
): Promise<boolean> {
  const [account] = await hiveClient.database.getAccounts([username.toLowerCase()]);
  if (!account) return false;

  const postingKeyAuths = account.posting.key_auths;
  if (!postingKeyAuths.length) return false;

  const hash = cryptoUtils.sha256(message);
  const sig = Signature.fromString(signature);
  const recoveredKey = sig.recover(hash);
  const recoveredKeyStr = recoveredKey.toString();

  return postingKeyAuths.some(([pubKey]) => pubKey === recoveredKeyStr);
}
