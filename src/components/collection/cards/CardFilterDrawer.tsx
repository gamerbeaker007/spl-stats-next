"use client";

import UnifiedCardFilterDrawer from "@/components/shared/filter/UnifiedCardFilterDrawer";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import type { FilterDrawerConfig } from "@/types/card-filter";

export { DRAWER_WIDTH } from "@/components/shared/filter/UnifiedCardFilterDrawer";

const BASE_CONFIG: FilterDrawerConfig = {
  ariaLabel: "Collection filter",
  showEditions: true,
  showRarities: true,
  showColors: true,
  showCardTypes: true,
  showFoils: true,
  showHideMissing: true,
};

interface CardFilterDrawerProps {
  showHideMissing?: boolean;
}

export function CardFilterDrawer({ showHideMissing = true }: Readonly<CardFilterDrawerProps>) {
  const { filter, setFilter, resetFilter, toggleFilterOpen } = useCardFilter();
  const config: FilterDrawerConfig = {
    ...BASE_CONFIG,
    showHideMissing,
  };

  return (
    <UnifiedCardFilterDrawer
      filter={filter}
      setFilter={setFilter}
      resetFilter={() => resetFilter()}
      toggleFilterOpen={toggleFilterOpen}
      config={config}
    />
  );
}
