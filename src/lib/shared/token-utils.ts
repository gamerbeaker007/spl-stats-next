/**
 * JWT token utility functions — shared between server and client.
 * Safe for both `"use server"` actions and client components.
 */

import { JWT_WARN_DAYS } from "./token-constants";

export type TokenExpiryState = "expired" | "expiring_soon" | "valid" | "unknown";

/**
 * Returns the expiry state for a given JWT expiry date.
 */
export function getTokenExpiryState(jwtExpiresAt: Date | null): TokenExpiryState {
  if (!jwtExpiresAt) return "unknown";
  const now = new Date();
  if (jwtExpiresAt <= now) return "expired";
  const warnMs = JWT_WARN_DAYS * 24 * 60 * 60 * 1000;
  if (jwtExpiresAt.getTime() - now.getTime() <= warnMs) return "expiring_soon";
  return "valid";
}

/**
 * Formats the time until (or since) a JWT expiry date as a human-readable string.
 * Examples:
 *   "expires in 5 days 3 hours 22 minutes"
 *   "expired 2 days 1 hour 30 minutes ago"
 */
export function formatTokenExpiry(jwtExpiresAt: Date | null): string {
  if (!jwtExpiresAt) return "expiry unknown";

  const now = new Date();
  const diffMs = jwtExpiresAt.getTime() - now.getTime();
  const expired = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const totalMinutes = Math.floor(absMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);

  const duration = parts.join(" ");
  return expired ? `expired ${duration} ago` : `expires in ${duration}`;
}
