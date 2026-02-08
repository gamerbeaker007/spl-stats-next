import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

/**
 * Derives a 256-bit key from the environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  // If key is hex, convert it. Otherwise, hash it to get 32 bytes
  if (key.length === KEY_LENGTH * 2) {
    return Buffer.from(key, "hex");
  }

  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypts a token using AES-256-GCM with a random IV
 * Returns the encrypted value, IV, and auth tag as separate hex strings
 */
export async function encryptToken(token: string): Promise<{
  encryptedValue: string;
  iv: string;
  authTag: string;
}> {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encryptedValue: encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  } catch (error) {
    throw new Error(
      `Token encryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypts a token using AES-256-GCM
 */
export async function decryptToken(
  encryptedValue: string,
  iv: string,
  authTag: string
): Promise<string> {
  try {
    const key = getEncryptionKey();
    const ivBuffer = Buffer.from(iv, "hex");
    const authTagBuffer = Buffer.from(authTag, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
    decipher.setAuthTag(authTagBuffer);

    let decrypted = decipher.update(encryptedValue, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Token decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generates a random encryption key (for setup purposes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}
