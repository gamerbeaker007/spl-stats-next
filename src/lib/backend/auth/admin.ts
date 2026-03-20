/**
 * Admin access is controlled by the ADMIN_USERNAMES env var —
 * a comma-separated list of Hive usernames that are allowed admin access.
 * Example: ADMIN_USERNAMES=beaker007,otheradmin
 */
export function isAdmin(username: string): boolean {
  const allowed = process.env.ADMIN_USERNAMES;
  if (!allowed) return false;
  return allowed
    .split(",")
    .map((u) => u.trim().toLowerCase())
    .includes(username.toLowerCase());
}
