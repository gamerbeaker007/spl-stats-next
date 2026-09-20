import type { MultiAccountDashboardCategories } from "@/lib/shared/dashboard-categories";

export interface MultiAccountDashboardConfig {
  categories: MultiAccountDashboardCategories;
}

export interface UserPreferences {
  multiAccountDashboard?: MultiAccountDashboardConfig;
}
