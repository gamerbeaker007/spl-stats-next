"use client";

import { createFilterContext } from "@/lib/frontend/context/createFilterContext";
import { DEFAULT_UNIFIED_FILTER, FILTER_STORAGE_KEYS } from "@/types/card-filter";

export const { Provider: CardStatsFilterProvider, useFilter: useCardStatsFilter } =
  createFilterContext(DEFAULT_UNIFIED_FILTER, FILTER_STORAGE_KEYS.cardStats);
