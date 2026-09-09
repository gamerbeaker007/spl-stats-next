import type { MarketActionMode } from "@/components/collection/marketplace/MarketActionDialogHost";
import type { DetailedPlayerCardCollectionItem } from "@/types/card";
import type {
  MarketplaceAssetGroup,
  MarketplaceAssetItem,
  OutbidStatus,
} from "@/types/marketplace-assets";

/** Grouped shows the base card plus its skins; flat shows only skin cards. */
export type SkinViewMode = "grouped" | "flat";

/** One base card with the skins that survived the active filters. */
export interface SkinGroupViewModel {
  group: MarketplaceAssetGroup;
  card: DetailedPlayerCardCollectionItem | null;
  visibleSkins: MarketplaceAssetItem[];
  totalOwnedCards: number;
  totalOwnedSkins: number;
}

/** Everything a skin tile needs beyond the item itself — shared by every skins layout. */
export interface SkinCardPresentation {
  onAction: (mode: MarketActionMode, item: MarketplaceAssetItem) => void;
  outbidStatuses: ReadonlyMap<string, OutbidStatus>;
  myListingCounts: ReadonlyMap<string, number>;
  isAuthenticated: boolean;
}
