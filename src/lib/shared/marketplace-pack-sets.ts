import { SET_DEFS } from "@/lib/shared/edition-utils";
import { edition_soulkeep_icon_url } from "@/lib/staticsIconUrls";

/**
 * Set-based options for the Packs shopping page. The set → pack `detailId`
 * mapping is the single source of truth in `edition-utils` (`SetDef.marketPackDetailIds`),
 * so sets, icons, labels, and their pack codes are maintained in one place.
 *
 * The only exception is `NIGHTMARE`: those Soulkeep-era packs have no visible
 * card set (Soulkeep is intentionally hidden from `SET_DEFS`), so they are added
 * here as a standalone option using the Soulkeep icon.
 */
export interface PackSetOption {
  /** Stable key for selection state. */
  key: string;
  label: string;
  iconUrl: string;
  /** Marketplace `PACKS` detailIds queried when this set is selected. */
  detailIds: string[];
}

const editionSetOptions: PackSetOption[] = SET_DEFS.filter(
  (set) => set.marketPackDetailIds && set.marketPackDetailIds.length > 0
).map((set) => ({
  key: set.setName,
  label: set.label,
  iconUrl: set.iconUrl,
  detailIds: [...(set.marketPackDetailIds ?? [])],
}));

/** Soulkeep-era Nightmare packs have no visible edition set, so surface them standalone. */
const nightmareOption: PackSetOption = {
  key: "nightmare",
  label: "Nightmare",
  iconUrl: edition_soulkeep_icon_url,
  detailIds: ["NIGHTMARE"],
};

export const PACK_SET_OPTIONS: PackSetOption[] = [...editionSetOptions, nightmareOption];

/**
 * The set of PACKS detailIds to show for the currently-selected set keys.
 * An empty selection means "no set filter" — the caller should show all packs.
 */
export function packDetailIdsForSets(selectedKeys: ReadonlySet<string>): Set<string> {
  const detailIds = new Set<string>();
  for (const option of PACK_SET_OPTIONS) {
    if (selectedKeys.has(option.key)) {
      for (const id of option.detailIds) detailIds.add(id);
    }
  }
  return detailIds;
}
