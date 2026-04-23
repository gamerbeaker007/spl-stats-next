"use client";

import UnifiedCardFilterDrawer from "@/components/shared/filter/UnifiedCardFilterDrawer";
import { useCardStatsFilter } from "@/lib/frontend/context/CardStatsFilterContext";
import { useAllCardOptions } from "@/hooks/card-stats/useAllCardOptions";
import type { FilterDrawerConfig } from "@/types/card-filter";

export { DRAWER_WIDTH } from "@/components/shared/filter/UnifiedCardFilterDrawer";

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
  const { cards: cardOptions, loading: cardOptionsLoading } = useAllCardOptions();

  return (
    <UnifiedCardFilterDrawer
      filter={filter}
      setFilter={setFilter}
      resetFilter={() => resetFilter()}
      toggleFilterOpen={toggleFilterOpen}
      config={CONFIG}
      cardOptions={cardOptions}
      cardOptionsLoading={cardOptionsLoading}
    />
  );
}
