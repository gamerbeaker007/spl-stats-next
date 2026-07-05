"use client";

import { createFilterContext } from "@/lib/frontend/context/createFilterContext";
import { getModernEditionPreset } from "@/lib/shared/card-filter-utils";
import {
  DEFAULT_UNIFIED_FILTER,
  FILTER_STORAGE_KEYS,
  type UnifiedCardFilter,
} from "@/types/card-filter";

const BUY_MISSING_CC_FILTER_DEFAULTS: UnifiedCardFilter = {
  ...DEFAULT_UNIFIED_FILTER,
  ...getModernEditionPreset(),
  foilCategories: ["regular"],
};

export const { Provider: BuyMissingCcFilterProvider, useFilter: useBuyMissingCcFilter } =
  createFilterContext(
    BUY_MISSING_CC_FILTER_DEFAULTS,
    `${FILTER_STORAGE_KEYS.collection}-buy-missing-cc`
  );
