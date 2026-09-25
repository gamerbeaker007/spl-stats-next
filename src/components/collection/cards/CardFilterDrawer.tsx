"use client";

import UnifiedCardFilterDrawer from "@/components/shared/filter/UnifiedCardFilterDrawer";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import type { CardOption } from "@/types/card";
import type { FilterDrawerConfig } from "@/types/card-filter";

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
  showFoils?: boolean;
  showCardSearch?: boolean;
  /** Restrict the card search; omit to search every card in the game. */
  cardOptions?: CardOption[];
  cardOptionsLoading?: boolean;
}

export function CardFilterDrawer({
  showFoils = true,
  showHideMissing = true,
  showCardSearch = true,
  cardOptions,
  cardOptionsLoading,
}: Readonly<CardFilterDrawerProps>) {
  const { filter, setFilter, resetFilter, toggleFilterOpen } = useCardFilter();
  const config: FilterDrawerConfig = {
    ...BASE_CONFIG,
    showFoils,
    showHideMissing,
    showCardSearch,
  };

  return (
    <UnifiedCardFilterDrawer
      filter={filter}
      setFilter={setFilter}
      resetFilter={() => resetFilter()}
      toggleFilterOpen={toggleFilterOpen}
      config={config}
      cardOptions={cardOptions}
      cardOptionsLoading={cardOptionsLoading}
    />
  );
}
