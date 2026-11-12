import PortfolioShell from "@/components/portfolio/PortfolioShell";
import { getMonitoredAccounts } from "@/lib/backend/actions/auth-actions";
import type { ReactNode } from "react";

/** Loads the monitored accounts once for the whole /portfolio section. */
export default async function PortfolioShellServer({ children }: { children: ReactNode }) {
  const accounts = await getMonitoredAccounts();
  return <PortfolioShell allAccounts={accounts.map((a) => a.username)}>{children}</PortfolioShell>;
}
