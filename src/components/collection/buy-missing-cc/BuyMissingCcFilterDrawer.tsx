"use client";

import UnifiedCardFilterDrawer from "@/components/shared/filter/UnifiedCardFilterDrawer";
import { useBuyMissingCcFilter } from "@/lib/frontend/context/BuyMissingCcFilterContext";
import type { FilterDrawerConfig } from "@/types/card-filter";

const CONFIG: FilterDrawerConfig = {
  ariaLabel: "Buy Missing CC filter",
  showEditions: true,
  showRarities: true,
  showColors: true,
  showCardTypes: true,
  showFoils: true,
  showHideMissing: false,
};

export default function BuyMissingCcFilterDrawer() {
  const { filter, setFilter, resetFilter, toggleFilterOpen } = useBuyMissingCcFilter();

  return (
    <UnifiedCardFilterDrawer
      filter={filter}
      setFilter={setFilter}
      resetFilter={resetFilter}
      toggleFilterOpen={toggleFilterOpen}
      config={CONFIG}
    />
  );
}
