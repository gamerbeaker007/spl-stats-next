import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import FortuneWinnersContent from "./FortuneWinnersContent";

/**
 * Server component — resolves the current user's monitored account names
 * and passes them to the client-side metrics page for the join-date feature.
 */
export default async function FortuneWinnersServer() {
  const accounts = await getMonitoredAccounts();
  const usernames = accounts.map((a) => a.username);

  return <FortuneWinnersContent monitoredAccounts={usernames} />;
}
