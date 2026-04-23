"use client";

import UnifiedCardFilterDrawer from "@/components/shared/filter/UnifiedCardFilterDrawer";
import { useBattleFilter } from "@/lib/frontend/context/BattleFilterContext";
import { useCardOptions } from "@/hooks/battles/useCardOptions";
import { useMonitoredAccountNames } from "@/hooks/battles/useMonitoredAccountNames";
import type { FilterDrawerConfig } from "@/types/card-filter";
import { useEffect } from "react";

export { DRAWER_WIDTH } from "@/components/shared/filter/UnifiedCardFilterDrawer";

export default function BattleFilterDrawer({
  showGroupLevels = true,
}: {
  showGroupLevels?: boolean;
}) {
  const { filter, setFilter, resetFilter, toggleFilterOpen } = useBattleFilter();
  const { accounts } = useMonitoredAccountNames();
  const { cards: cardOptions, loading: cardOptionsLoading } = useCardOptions(filter.account);

  // Auto-select account on load; switch if the selected account is removed
  useEffect(() => {
    if (accounts.length === 0) return;
    if (!filter.account || !accounts.includes(filter.account)) {
      setFilter({ account: accounts[0] });
    }
  }, [accounts, filter.account, setFilter]);

  const config: FilterDrawerConfig = {
    ariaLabel: "Battle filter",
    showAccount: true,
    showSinceDays: true,
    showCardSearch: true,
    showFormats: true,
    showMatchTypes: true,
    showCardTypes: true,
    showRarities: true,
    showColors: true,
    showEditions: true,
    showFoils: true,
    showMana: true,
    showGrouping: showGroupLevels,
    showSorting: true,
    showTopCount: true,
    showMinBattleCount: true,
  };

  return (
    <UnifiedCardFilterDrawer
      filter={filter}
      setFilter={setFilter}
      resetFilter={() => resetFilter()}
      toggleFilterOpen={toggleFilterOpen}
      config={config}
      accounts={accounts}
      cardOptions={cardOptions}
      cardOptionsLoading={cardOptionsLoading}
    />
  );
}
