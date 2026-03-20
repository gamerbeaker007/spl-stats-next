import crypto from "node:crypto";

const USER_COOKIE = "spl_user_id";

function getSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) throw new Error("COOKIE_SECRET environment variable is not set");
  return secret;
}

/** HMAC-sign a value so it can't be forged. */
function sign(value: string): string {
  const mac = crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
  return `${value}.${mac}`;
}

/** Verify and extract the original value, or return null if tampered. */
function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? value : null;
}

export async function setUserCookie(userId: string) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE, sign(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getUserIdFromCookie(): Promise<string | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const raw = cookieStore.get(USER_COOKIE)?.value;
  if (!raw) return null;
  return unsign(raw);
}

export async function deleteUserCookie() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete(USER_COOKIE);
}
