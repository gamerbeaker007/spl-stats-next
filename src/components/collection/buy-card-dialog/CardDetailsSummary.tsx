"use client";

import {
  getCardSetIconUrl,
  getCardSetLabel,
  getCardSetTier,
  getEditionIconUrl,
  getEditionLabel,
} from "@/lib/shared/edition-utils";
import { getRarityIconUrl, getRarityId, getRarityLabel } from "@/lib/shared/rarity-utils";
import { cardRoleIconMap, cardRoleLabelMap, DetailedPlayerCardCollectionItem } from "@/types/card";
import { Stack, Typography } from "@mui/material";
import Image from "next/image";

interface CardDetailsSummaryProps {
  card: DetailedPlayerCardCollectionItem;
}

interface DetailLineProps {
  label: string;
  value: string;
  iconUrl?: string;
  iconAlt?: string;
}

function DetailLine({ label, value, iconUrl, iconAlt }: Readonly<DetailLineProps>) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
      <Typography variant="body2" component="span" color="text.secondary" sx={{ minWidth: 52 }}>
        {label}:
      </Typography>
      {iconUrl && (
        <Image
          src={iconUrl}
          alt={iconAlt ?? label}
          width={18}
          height={18}
          style={{ objectFit: "contain" }}
        />
      )}
      <Typography variant="body2" component="span">
        {value}
      </Typography>
    </Stack>
  );
}

export default function CardDetailsSummary({ card }: Readonly<CardDetailsSummaryProps>) {
  const resolvedRarity = card.rarity;
  const resolvedTier = card.tier;
  const resolvedRole = card.role;

  const rarityLabel = resolvedRarity ? getRarityLabel(resolvedRarity) : undefined;
  const rarityId = resolvedRarity ? getRarityId(resolvedRarity) : undefined;
  const rarityIcon = resolvedRarity ? getRarityIconUrl(resolvedRarity) : undefined;
  const roleLabel = resolvedRole ? cardRoleLabelMap[resolvedRole] : "Unknown";
  const roleIcon = resolvedRole ? cardRoleIconMap[resolvedRole] : undefined;

  const setLabel = getCardSetLabel(card.edition, resolvedTier);
  const setTier = getCardSetTier(card.edition, resolvedTier);
  const setIcon = getCardSetIconUrl(card.edition, resolvedTier);
  const editionLabel = getEditionLabel(card.edition) ?? `Edition ${card.edition}`;
  const editionIcon = getEditionIconUrl(card.edition);

  return (
    <Stack spacing={0.75}>
      <Typography variant="h6">{card.name}</Typography>
      <DetailLine
        label="Rarity"
        value={rarityLabel && rarityId ? `${rarityLabel} (${rarityId})` : "Unknown"}
        iconUrl={rarityIcon}
        iconAlt={rarityLabel}
      />
      <DetailLine label="Type" value={roleLabel} iconUrl={roleIcon} iconAlt={roleLabel} />
      <DetailLine
        label="Set"
        value={`${setLabel ?? "Unknown"}${typeof setTier === "number" ? ` (${setTier})` : ""}`}
        iconUrl={setIcon}
        iconAlt={setLabel}
      />
      <DetailLine
        label="Edition"
        value={`${editionLabel} (${card.edition})`}
        iconUrl={editionIcon}
        iconAlt={editionLabel}
      />
    </Stack>
  );
}
