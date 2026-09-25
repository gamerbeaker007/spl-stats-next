"use client";

import UnifiedCardFilterDrawer from "@/components/shared/filter/UnifiedCardFilterDrawer";
import { useCardStatsFilter } from "@/lib/frontend/context/CardStatsFilterContext";
import type { FilterDrawerConfig } from "@/types/card-filter";

const CONFIG: FilterDrawerConfig = {
  ariaLabel: "Card stats filter",
  showEditions: true,
  showRarities: true,
  showColors: true,
  showCardTypes: true,
  showFoils: true,
  showCardSearch: true,
};

export default function CardStatsFilterDrawer() {
  const { filter, setFilter, resetFilter, toggleFilterOpen } = useCardStatsFilter();

  return (
    <UnifiedCardFilterDrawer
      filter={filter}
      setFilter={setFilter}
      resetFilter={() => resetFilter()}
      toggleFilterOpen={toggleFilterOpen}
      config={CONFIG}
    />
  );
}
