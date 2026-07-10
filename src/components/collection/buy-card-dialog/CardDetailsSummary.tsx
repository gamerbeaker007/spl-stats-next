"use client";

import {
  getCardSetIconUrl,
  getCardSetLabel,
  getEditionIconUrl,
  getEditionLabel,
} from "@/lib/shared/edition-utils";
import { getRarityIconUrl, getRarityLabel } from "@/lib/shared/rarity-utils";
import { cardRoleIconMap, cardRoleLabelMap, DetailedPlayerCardCollectionItem } from "@/types/card";
import { Stack, Typography } from "@mui/material";
import Image from "next/image";
import { RxDividerVertical } from "react-icons/rx";

interface CardDetailsSummaryProps {
  card: DetailedPlayerCardCollectionItem;
}

interface DetailLineProps {
  value?: string;
  tooltip?: string;
  iconUrl?: string;
}

function DetailLine({ tooltip, value, iconUrl }: Readonly<DetailLineProps>) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
      {iconUrl && (
        <Image
          src={iconUrl}
          alt={tooltip ?? ""}
          width={18}
          height={18}
          style={{ objectFit: "contain" }}
        />
      )}
      {value && (
        <Typography variant="body2" component="span">
          {value}
        </Typography>
      )}
    </Stack>
  );
}

export default function CardDetailsSummary({ card }: Readonly<CardDetailsSummaryProps>) {
  const resolvedRarity = card.rarity;
  const resolvedTier = card.tier;
  const resolvedRole = card.role;

  const rarityLabel = getRarityLabel(resolvedRarity) ?? "Unknown";
  const rarityIcon = resolvedRarity ? getRarityIconUrl(resolvedRarity) : undefined;
  const roleLabel = resolvedRole ? cardRoleLabelMap[resolvedRole] : "Unknown";
  const roleIcon = resolvedRole ? cardRoleIconMap[resolvedRole] : undefined;

  const setLabel = getCardSetLabel(card.edition, resolvedTier);
  const setIcon = getCardSetIconUrl(card.edition, resolvedTier);
  const editionLabel = getEditionLabel(card.edition) ?? `Edition ${card.edition}`;
  const editionIcon = getEditionIconUrl(card.edition);

  return (
    <Stack direction="column" spacing={0.75}>
      <Typography variant="h6">{card.name}</Typography>
      <Stack direction="row" spacing={0.5} sx={{ ml: 1 }}>
        <DetailLine iconUrl={rarityIcon} tooltip={rarityLabel} />
        <RxDividerVertical />
        <DetailLine iconUrl={roleIcon} tooltip={roleLabel} />
        <RxDividerVertical />
        <DetailLine iconUrl={setIcon} tooltip={setLabel} />
        <RxDividerVertical />
        <DetailLine iconUrl={editionIcon} tooltip={editionLabel} />
      </Stack>
    </Stack>
  );
}
