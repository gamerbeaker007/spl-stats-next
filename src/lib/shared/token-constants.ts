/**
 * JWT token warning constants — shared between server and client.
 * Safe for both `"use server"` actions and client components.
 */

/**
 * Number of days before JWT expiry at which a warning is shown.
 * Adjust based on how long Splinterlands JWT tokens are actually valid.
 */
export const JWT_WARN_DAYS = 2;
