"use client";

import LandIcon from "@/components/collection/land-market/LandIcon";
import {
  LAND_DETAIL_DEFS,
  LAND_RESOURCE_DEFS,
  LAND_TYPE_LABELS,
  capitalize,
  getLandMagicTypeIconUrl,
  getLandRarityIconUrl,
  getLandTerrainIconUrl,
  getLandTerrainLabel,
  getLandTypeIconUrl,
  getLandWorksiteDef,
} from "@/lib/shared/land-deed-utils";
import type { LandMarketListing } from "@/types/land/landMarket";
import { Stack, Typography } from "@mui/material";

/**
 * Icon renderers for the land attributes shown in both the table and the grid,
 * so each attribute is drawn (and tooltipped) the same way everywhere.
 */

interface ListingProps {
  listing: LandMarketListing;
  size?: number;
}

function Empty() {
  return (
    <Typography variant="body2" color="text.disabled">
      -
    </Typography>
  );
}

export function LandTerrainIcon({ listing, size }: Readonly<ListingProps>) {
  return (
    <LandIcon
      src={getLandTerrainIconUrl(listing.terrain)}
      label={getLandTerrainLabel(listing.terrain)}
      size={size}
    />
  );
}

export function LandRarityIcon({ listing, size }: Readonly<ListingProps>) {
  if (!listing.rarity) return <Empty />;
  return (
    <LandIcon
      src={getLandRarityIconUrl(listing.rarity)}
      label={capitalize(listing.rarity)}
      size={size}
    />
  );
}

/** Land type icon, plus the element icon for magical plots. */
export function LandTypeIcons({ listing, size }: Readonly<ListingProps>) {
  if (!listing.landType) return <Empty />;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <LandIcon
        src={getLandTypeIconUrl(listing.landType)}
        label={LAND_TYPE_LABELS[listing.landType]}
        size={size}
      />
      {listing.magicType && (
        <LandIcon
          src={getLandMagicTypeIconUrl(listing.magicType)}
          label={`Magic type: ${capitalize(listing.magicType)}`}
          size={size}
        />
      )}
    </Stack>
  );
}

export function LandResourceIcons({ listing, size }: Readonly<ListingProps>) {
  if (listing.resources.length === 0) return <Empty />;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {listing.resources.map((resource) => (
        <LandIcon
          key={resource}
          src={LAND_RESOURCE_DEFS[resource].iconUrl}
          label={LAND_RESOURCE_DEFS[resource].label}
          size={size}
        />
      ))}
    </Stack>
  );
}

export function LandWorksiteResourceIcon({ listing, size }: Readonly<ListingProps>) {
  const worksite = getLandWorksiteDef(listing.worksite);
  if (!worksite) return <Empty />;
  return <LandIcon src={worksite.resourceIconUrl} label={worksite.label} size={size} />;
}

export function LandDetailIcons({ listing, size }: Readonly<ListingProps>) {
  const active = LAND_DETAIL_DEFS.filter((def) => listing.details[def.key]);
  if (active.length === 0) return <Empty />;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {active.map((def) => (
        <LandIcon key={def.key} src={def.iconUrl} label={def.label} size={size} />
      ))}
    </Stack>
  );
}
