"use client";

import { getMonitoredAccountNamesAction } from "@/lib/backend/actions/battle-overview-actions";
import { useEffect, useState } from "react";

export function useMonitoredAccountNames(): { accounts: string[]; loading: boolean } {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonitoredAccountNamesAction()
      .then(setAccounts)
      .finally(() => setLoading(false));
  }, []);

  return { accounts, loading };
}
