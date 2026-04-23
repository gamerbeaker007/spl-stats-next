"use client";

import { createFilterContext } from "@/lib/frontend/context/createFilterContext";
import { getModernEditionPreset } from "@/lib/shared/card-filter-utils";
import {
  DEFAULT_UNIFIED_FILTER,
  FILTER_STORAGE_KEYS,
  type UnifiedCardFilter,
} from "@/types/card-filter";

const COLLECTION_FILTER_DEFAULTS: UnifiedCardFilter = {
  ...DEFAULT_UNIFIED_FILTER,
  ...getModernEditionPreset(),
};

export const { Provider: CardFilterProvider, useFilter: useCardFilter } = createFilterContext(
  COLLECTION_FILTER_DEFAULTS,
  FILTER_STORAGE_KEYS.collection
);
