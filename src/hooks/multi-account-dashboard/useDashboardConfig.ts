"use client";

import {
  getDashboardConfigAction,
  saveDashboardConfigAction,
} from "@/lib/backend/actions/dashboard-config-actions";
import {
  getDefaultCategories,
  type MultiAccountDashboardCategories,
} from "@/lib/shared/dashboard-categories";
import { useCallback, useEffect, useState } from "react";

interface UseDashboardConfigReturn {
  config: MultiAccountDashboardCategories;
  loading: boolean;
  updateConfig: (categories: MultiAccountDashboardCategories) => Promise<void>;
}

export function useDashboardConfig(): UseDashboardConfigReturn {
  const [config, setConfig] = useState<MultiAccountDashboardCategories>(getDefaultCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardConfigAction()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  const updateConfig = useCallback(async (categories: MultiAccountDashboardCategories) => {
    setConfig(categories);
    await saveDashboardConfigAction(categories);
  }, []);

  return { config, loading, updateConfig };
}
