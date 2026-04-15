"use client";

/**
 * Shared edition/set filter UI used by both BattleFilterDrawer and CardStatsFilterDrawer.
 * Groups editions by set (era), with sub-icons for individual editions and cross-era
 * promo / reward / extra cards.
 */

import { EDITION_OPTIONS, EDITION_SET_GROUPS } from "@/lib/shared/edition-utils";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";

/** Set names considered "Modern" format in SPL. */
export const MODERN_SET_NAMES = ["rebellion", "conclave", "foundation"] as const;

const promoIconUrl = EDITION_OPTIONS.find((e) => e.value === 2)!.iconUrl;
const rewardIconUrl = EDITION_OPTIONS.find((e) => e.value === 3)!.iconUrl;
const extraIconUrl = EDITION_OPTIONS.find((e) => e.value === 17)!.iconUrl;

function SubIcon({
  iconUrl,
  label,
  active,
  onClick,
}: {
  iconUrl: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip title={label} placement="top" arrow>
      <Box
        onClick={onClick}
        sx={{
          width: 28,
          height: 28,
          p: 0.25,
          cursor: "pointer",
          borderRadius: 1,
          border: 1.5,
          borderColor: active ? "primary.main" : "divider",
          bgcolor: active ? "action.selected" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: active ? 1 : 0.4,
          transition: "all 0.15s",
          "&:hover": { bgcolor: "action.hover", opacity: 1 },
        }}
      >
        <Image src={iconUrl} alt={label} width={18} height={18} style={{ objectFit: "contain" }} />
      </Box>
    </Tooltip>
  );
}

export interface EditionSetFilterProps {
  selectedEditions: number[];
  onEditionsChange: (v: number[]) => void;
  selectedPromoTiers: number[];
  onPromoTiersChange: (v: number[]) => void;
  selectedRewardTiers: number[];
  onRewardTiersChange: (v: number[]) => void;
  selectedExtraTiers: number[];
  onExtraTiersChange: (v: number[]) => void;
}

export default function EditionSetFilter({
  selectedEditions,
  onEditionsChange,
  selectedPromoTiers,
  onPromoTiersChange,
  selectedRewardTiers,
  onRewardTiersChange,
  selectedExtraTiers,
  onExtraTiersChange,
}: EditionSetFilterProps) {
  const validIds = (group: (typeof EDITION_SET_GROUPS)[number]) =>
    group.editions.filter((id) => EDITION_OPTIONS.some((e) => e.value === id));

  const handleModern = () => {
    const groups = EDITION_SET_GROUPS.filter((g) =>
      (MODERN_SET_NAMES as readonly string[]).includes(g.setName)
    );
    onEditionsChange(groups.flatMap((g) => validIds(g)));
    onPromoTiersChange(groups.filter((g) => g.hasPromo && g.tier !== null).map((g) => g.tier!));
    onRewardTiersChange(groups.filter((g) => g.hasReward && g.tier !== null).map((g) => g.tier!));
    onExtraTiersChange(groups.filter((g) => g.hasExtra && g.tier !== null).map((g) => g.tier!));
  };

  const handleWild = () => {
    onEditionsChange([]);
    onPromoTiersChange([]);
    onRewardTiersChange([]);
    onExtraTiersChange([]);
  };

  const toggleEdition = (id: number) => {
    onEditionsChange(
      selectedEditions.includes(id)
        ? selectedEditions.filter((x) => x !== id)
        : [...selectedEditions, id]
    );
  };

  const togglePromoTier = (tier: number) => {
    onPromoTiersChange(
      selectedPromoTiers.includes(tier)
        ? selectedPromoTiers.filter((t) => t !== tier)
        : [...selectedPromoTiers, tier]
    );
  };

  const toggleRewardTier = (tier: number) => {
    onRewardTiersChange(
      selectedRewardTiers.includes(tier)
        ? selectedRewardTiers.filter((t) => t !== tier)
        : [...selectedRewardTiers, tier]
    );
  };

  const toggleExtraTier = (tier: number) => {
    onExtraTiersChange(
      selectedExtraTiers.includes(tier)
        ? selectedExtraTiers.filter((t) => t !== tier)
        : [...selectedExtraTiers, tier]
    );
  };

  return (
    <Stack spacing={0.75} sx={{ mt: 0.5 }}>
      <Stack direction="row" spacing={0.75}>
        <Button
          size="small"
          variant="outlined"
          onClick={handleModern}
          sx={{ flex: 1, textTransform: "none", fontSize: 12, py: 0.25 }}
        >
          Modern
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={handleWild}
          sx={{ flex: 1, textTransform: "none", fontSize: 12, py: 0.25 }}
        >
          Wild (all)
        </Button>
      </Stack>

      {EDITION_SET_GROUPS.map((group) => {
        const ids = validIds(group);
        if (ids.length === 0) return null;

        const nativeFull = ids.every((id) => selectedEditions.includes(id));
        const nativeAny = ids.some((id) => selectedEditions.includes(id));
        const promoFull =
          !group.hasPromo || (group.tier !== null && selectedPromoTiers.includes(group.tier));
        const rewardFull =
          !group.hasReward || (group.tier !== null && selectedRewardTiers.includes(group.tier));
        const extraFull =
          !group.hasExtra || (group.tier !== null && selectedExtraTiers.includes(group.tier));
        const full = nativeFull && promoFull && rewardFull && extraFull;
        const partial =
          !full &&
          (nativeAny ||
            (group.hasPromo && group.tier !== null && selectedPromoTiers.includes(group.tier)) ||
            (group.hasReward && group.tier !== null && selectedRewardTiers.includes(group.tier)) ||
            (group.hasExtra && group.tier !== null && selectedExtraTiers.includes(group.tier)));

        const hasSubContent =
          ids.length > 1 || group.hasPromo || group.hasReward || group.hasExtra;

        const toggleSet = () => {
          if (full) {
            onEditionsChange(selectedEditions.filter((id) => !ids.includes(id)));
            if (group.hasPromo && group.tier !== null)
              onPromoTiersChange(selectedPromoTiers.filter((t) => t !== group.tier));
            if (group.hasReward && group.tier !== null)
              onRewardTiersChange(selectedRewardTiers.filter((t) => t !== group.tier));
            if (group.hasExtra && group.tier !== null)
              onExtraTiersChange(selectedExtraTiers.filter((t) => t !== group.tier));
          } else {
            onEditionsChange([...new Set([...selectedEditions, ...ids])]);
            if (group.hasPromo && group.tier !== null)
              onPromoTiersChange([...new Set([...selectedPromoTiers, group.tier])]);
            if (group.hasReward && group.tier !== null)
              onRewardTiersChange([...new Set([...selectedRewardTiers, group.tier])]);
            if (group.hasExtra && group.tier !== null)
              onExtraTiersChange([...new Set([...selectedExtraTiers, group.tier])]);
          }
        };

        return (
          <Stack key={group.setName} direction="row" alignItems="center" flexWrap="wrap" gap={0.5}>
            <Tooltip
              title={hasSubContent ? `${group.label} (select all)` : group.label}
              placement="top"
              arrow
            >
              <Box
                onClick={toggleSet}
                sx={{
                  width: 36,
                  height: 36,
                  p: 0.5,
                  cursor: "pointer",
                  borderRadius: 1,
                  border: 2,
                  borderColor: full ? "primary.main" : partial ? "warning.main" : "divider",
                  bgcolor: full || partial ? "action.selected" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: full || partial ? 1 : 0.5,
                  transition: "all 0.15s",
                  "&:hover": { bgcolor: "action.hover", opacity: 1 },
                }}
              >
                <Image
                  src={group.iconUrl}
                  alt={group.label}
                  width={24}
                  height={24}
                  style={{ objectFit: "contain" }}
                />
              </Box>
            </Tooltip>

            {(ids.length > 1 || group.hasPromo || group.hasReward || group.hasExtra) &&
              ids.map((id) => {
                const opt = EDITION_OPTIONS.find((e) => e.value === id)!;
                return (
                  <SubIcon
                    key={id}
                    iconUrl={opt.iconUrl}
                    label={opt.label}
                    active={selectedEditions.includes(id)}
                    onClick={() => toggleEdition(id)}
                  />
                );
              })}

            {group.hasPromo && group.tier !== null && (
              <SubIcon
                iconUrl={promoIconUrl}
                label={`${group.label} era Promo`}
                active={selectedPromoTiers.includes(group.tier)}
                onClick={() => togglePromoTier(group.tier!)}
              />
            )}

            {group.hasReward && group.tier !== null && (
              <SubIcon
                iconUrl={rewardIconUrl}
                label={`${group.label} era Reward`}
                active={selectedRewardTiers.includes(group.tier)}
                onClick={() => toggleRewardTier(group.tier!)}
              />
            )}

            {group.hasExtra && group.tier !== null && (
              <SubIcon
                iconUrl={extraIconUrl}
                label={`${group.label} Extra`}
                active={selectedExtraTiers.includes(group.tier)}
                onClick={() => toggleExtraTier(group.tier!)}
              />
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
