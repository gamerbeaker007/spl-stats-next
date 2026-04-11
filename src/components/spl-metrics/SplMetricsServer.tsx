import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import SplMetricsContent from "@/components/spl-metrics/SplMetricsContent";

/**
 * Server component — resolves the current user's monitored account names
 * and passes them to the client-side metrics page for the join-date feature.
 */
export default async function SplMetricsServer() {
  const accounts = await getMonitoredAccounts();
  const usernames = accounts.map((a) => a.username);

  return <SplMetricsContent monitoredAccounts={usernames} />;
}
