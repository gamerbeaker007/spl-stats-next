import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import {
  DEFAULT_SKIN_DISPLAY_NAME,
  DEFAULT_SKIN_NAME,
  isSkinActive,
} from "@/lib/shared/marketplace-assets";
import type { DetailedPlayerCardCollectionItem } from "@/types/card";
import type { MarketplaceAssetGroup, MarketplaceAssetItem } from "@/types/marketplace-assets";

/** Pick the collection card whose edition matches one of the group's skins, else the first owned card. */
export function chooseRepresentativeCard(
  skins: MarketplaceAssetItem[],
  cardCandidates: DetailedPlayerCardCollectionItem[]
): DetailedPlayerCardCollectionItem | null {
  if (cardCandidates.length === 0) return null;

  const preferredEditions = new Set(
    skins.flatMap((skin) => [skin.imageCardEditionId, ...skin.cardEditionIds])
  );
  return (
    cardCandidates.find((candidate) => preferredEditions.has(candidate.edition)) ??
    cardCandidates[0]
  );
}

/** All cards in the detailed collection that belong to one skin group. */
export function findCardCandidates(
  detailedCollection: Record<string, DetailedPlayerCardCollectionItem> | undefined,
  cardDetailId: number
): DetailedPlayerCardCollectionItem[] {
  return Object.values(detailedCollection ?? {}).filter(
    (entry) => entry.cardDetailId === cardDetailId
  );
}

/**
 * Synthetic "no skin" item — the base card rendered as if it were a skin, so it
 * can be activated through the same dialog flow as a real skin.
 */
export function buildBaseSkinItem(args: {
  cardDetailId: number;
  groupName: string;
  image: string;
  active: boolean;
}): MarketplaceAssetItem {
  const detailId = `base:${args.cardDetailId}`;

  return {
    assetName: "SKINS",
    detailId,
    detailIdNumber: args.cardDetailId,
    itemId: detailId,
    displayName: DEFAULT_SKIN_DISPLAY_NAME,
    groupName: args.groupName,
    setName: DEFAULT_SKIN_NAME,
    image: args.image,
    icon: null,
    filterIcon: null,
    description: "",
    rarity: null,
    numCirculation: 0,
    ownedQuantity: 1,
    actualOwned: 1,
    currentlyListed: 0,
    availableToList: 0,
    numOwned: 1,
    numListed: 0,
    prices: [],
    cardDetailId: args.cardDetailId,
    cardEditionIds: [],
    imageCardEditionId: null,
    active: args.active,
    baseSkin: true,
    activationSkinName: DEFAULT_SKIN_NAME,
  };
}

export interface GroupBaseSkin {
  baseCardImage: string;
  /** No owned skin is equipped, so the card renders with its default artwork. */
  baseSkinActive: boolean;
  baseSkinItem: MarketplaceAssetItem;
}

/**
 * Resolve the base-card artwork and its synthetic skin item for one group.
 * Shared by the grouped grid and the activate dialog so both show the same card.
 */
export function resolveGroupBaseSkin(
  group: MarketplaceAssetGroup,
  card: DetailedPlayerCardCollectionItem | null
): GroupBaseSkin {
  const fallbackSkin = group.items[0];
  const fallbackEdition = fallbackSkin?.imageCardEditionId ?? fallbackSkin?.cardEditionIds[0] ?? 1;
  const baseCardImage = getCardImageByLevel(
    card?.name ?? group.groupName,
    card?.highestLevelCard?.edition ?? card?.edition ?? fallbackEdition,
    card?.highestLevelCard?.foil ?? "regular",
    card?.highestLevelCard?.level ?? 1
  );
  const baseSkinActive = !group.items.some(isSkinActive);

  return {
    baseCardImage,
    baseSkinActive,
    baseSkinItem: buildBaseSkinItem({
      cardDetailId: group.cardDetailId,
      groupName: group.groupName,
      image: baseCardImage,
      active: baseSkinActive,
    }),
  };
}
