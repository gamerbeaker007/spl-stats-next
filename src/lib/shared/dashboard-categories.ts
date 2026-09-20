export type DataSource = "playerStatus" | "collection" | "seasonRewards" | "daily" | "land";

export type DashboardCategoryGroup = "General" | "Balances" | "Gameplay" | "Rankings";

export type DashboardCategoryId =
  | "history"
  | "rating"
  | "balanceMain"
  | "balanceElectronium"
  | "balancePotions"
  | "balanceScrolls"
  | "balanceGuild"
  | "balanceGlint"
  | "collection"
  | "brawl"
  | "draws"
  | "daily"
  | "land"
  | "leaderboard";

export interface DashboardCategoryDef {
  id: DashboardCategoryId;
  label: string;
  group: DashboardCategoryGroup;
  defaultEnabled: boolean;
  dataSources: DataSource[];
}

export type MultiAccountDashboardCategories = Record<DashboardCategoryId, boolean>;

export const DASHBOARD_CATEGORY_DEFINITIONS: Record<DashboardCategoryId, DashboardCategoryDef> = {
  history: {
    id: "history",
    label: "Reward & Balance History",
    group: "General",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
  rating: {
    id: "rating",
    label: "Rating",
    group: "General",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
  balanceMain: {
    id: "balanceMain",
    label: "Main",
    group: "Balances",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
  balanceElectronium: {
    id: "balanceElectronium",
    label: "Electroneum",
    group: "Balances",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
  balancePotions: {
    id: "balancePotions",
    label: "Potions",
    group: "Balances",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
  balanceScrolls: {
    id: "balanceScrolls",
    label: "Scrolls",
    group: "Balances",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
  balanceGuild: {
    id: "balanceGuild",
    label: "Guild Balance",
    group: "Balances",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
  balanceGlint: {
    id: "balanceGlint",
    label: "Glint",
    group: "Balances",
    defaultEnabled: true,
    dataSources: ["seasonRewards"],
  },
  collection: {
    id: "collection",
    label: "Card Collection",
    group: "Balances",
    defaultEnabled: true,
    dataSources: ["collection"],
  },
  brawl: {
    id: "brawl",
    label: "Brawl",
    group: "Gameplay",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
  draws: {
    id: "draws",
    label: "Battle Modes (Frontier/Ranked)",
    group: "Gameplay",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
  daily: {
    id: "daily",
    label: "Daily Progress",
    group: "Gameplay",
    defaultEnabled: true,
    dataSources: ["daily"],
  },
  land: {
    id: "land",
    label: "Land",
    group: "Gameplay",
    defaultEnabled: true,
    dataSources: ["land"],
  },
  leaderboard: {
    id: "leaderboard",
    label: "Leaderboard",
    group: "Rankings",
    defaultEnabled: true,
    dataSources: ["playerStatus"],
  },
};

export const DASHBOARD_CATEGORY_GROUPS: DashboardCategoryGroup[] = [
  "General",
  "Balances",
  "Gameplay",
  "Rankings",
];

const ALL_DATA_SOURCES: Set<DataSource> = new Set([
  "playerStatus",
  "collection",
  "seasonRewards",
  "daily",
  "land",
]);

export function getDefaultCategories(): MultiAccountDashboardCategories {
  return Object.fromEntries(
    Object.values(DASHBOARD_CATEGORY_DEFINITIONS).map((def) => [def.id, def.defaultEnabled])
  ) as MultiAccountDashboardCategories;
}

export function resolveRequiredSources(
  categories: MultiAccountDashboardCategories,
  loadAll?: boolean
): Set<DataSource> {
  if (loadAll) return ALL_DATA_SOURCES;
  const required = new Set<DataSource>();
  for (const [id, enabled] of Object.entries(categories) as [DashboardCategoryId, boolean][]) {
    if (enabled) {
      for (const src of DASHBOARD_CATEGORY_DEFINITIONS[id].dataSources) {
        required.add(src);
      }
    }
  }
  return required;
}

export function getCategoriesInGroup(group: DashboardCategoryGroup): DashboardCategoryDef[] {
  return Object.values(DASHBOARD_CATEGORY_DEFINITIONS).filter((def) => def.group === group);
}
