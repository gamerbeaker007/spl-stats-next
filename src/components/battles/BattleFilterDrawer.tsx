"use client";

import { useBattleFilter } from "@/lib/frontend/context/BattleFilterContext";
import {
  CARD_TYPE_OPTIONS,
  COLOR_OPTIONS,
  EDITION_OPTIONS,
  EDITION_SET_GROUPS,
  FORMAT_OPTIONS,
  MATCH_TYPE_OPTIONS,
  RARITY_OPTIONS,
  SINCE_OPTIONS,
  SORT_OPTIONS,
  TOP_COUNT_OPTIONS,
  type BattleFilter,
} from "@/types/battles";
import { useMonitoredAccountNames } from "@/hooks/battles/useMonitoredAccountNames";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useEffect } from "react";
import { MdClose, MdFilterList, MdRestartAlt } from "react-icons/md";

export const DRAWER_WIDTH = 280;

// ---------------------------------------------------------------------------
// FilterSection wrapper
// ---------------------------------------------------------------------------

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {title}
      </Typography>
      <Box sx={{ mt: 0.5 }}>{children}</Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// IconFilterGroup — icon-only toggle buttons with tooltip labels
// ---------------------------------------------------------------------------

function IconFilterGroup<T extends string | number>({
  options,
  selected,
  onChange,
}: {
  options: readonly { value: T; label: string; iconUrl: string }[];
  selected: T[];
  onChange: (v: T[]) => void;
}) {
  const toggle = (v: T) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
      {options.map(({ value, label, iconUrl }) => {
        const active = selected.includes(value);
        return (
          <Tooltip key={String(value)} title={label} placement="top" arrow>
            <Box
              onClick={() => toggle(value)}
              sx={{
                width: 36,
                height: 36,
                p: 0.5,
                cursor: "pointer",
                borderRadius: 1,
                border: 2,
                borderColor: active ? "primary.main" : "divider",
                bgcolor: active ? "action.selected" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: active ? 1 : 0.5,
                transition: "all 0.15s",
                "&:hover": { bgcolor: "action.hover", opacity: 1 },
              }}
            >
              <Image
                src={iconUrl}
                alt={label}
                width={24}
                height={24}
                style={{ objectFit: "contain" }}
              />
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// EditionSetFilter — unified grouped edition selector
// All sets: native editions go into `editions`, promo/reward go into promoTiers/rewardTiers.
// Big icon = select all (native + promo + reward). Sub-icons select individually.
// ---------------------------------------------------------------------------

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

function EditionSetFilter({
  selectedEditions,
  onEditionsChange,
  selectedPromoTiers,
  onPromoTiersChange,
  selectedRewardTiers,
  onRewardTiersChange,
  selectedExtraTiers,
  onExtraTiersChange,
}: {
  selectedEditions: number[];
  onEditionsChange: (v: number[]) => void;
  selectedPromoTiers: number[];
  onPromoTiersChange: (v: number[]) => void;
  selectedRewardTiers: number[];
  onRewardTiersChange: (v: number[]) => void;
  selectedExtraTiers: number[];
  onExtraTiersChange: (v: number[]) => void;
}) {
  const validIds = (group: (typeof EDITION_SET_GROUPS)[number]) =>
    group.editions.filter((id) => EDITION_OPTIONS.some((e) => e.value === id));

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

        const hasSubContent = ids.length > 1 || group.hasPromo || group.hasReward || group.hasExtra;

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
            {/* Big set icon — selects all native editions + promo/reward for this set */}
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

            {/* Sub-edition icons — shown when set has multiple native editions OR has
                cross-era cards (so the user can select native-only independently) */}
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

            {/* Promo sub-icon (edition=2, tier=eraTier) */}
            {group.hasPromo && group.tier !== null && (
              <SubIcon
                iconUrl={promoIconUrl}
                label={`${group.label} era Promo`}
                active={selectedPromoTiers.includes(group.tier)}
                onClick={() => togglePromoTier(group.tier!)}
              />
            )}

            {/* Reward sub-icon (edition=3, tier=eraTier) */}
            {group.hasReward && group.tier !== null && (
              <SubIcon
                iconUrl={rewardIconUrl}
                label={`${group.label} era Reward`}
                active={selectedRewardTiers.includes(group.tier)}
                onClick={() => toggleRewardTier(group.tier!)}
              />
            )}

            {/* Extra sub-icon (edition=17, tier=eraTier) */}
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

// ---------------------------------------------------------------------------
// Main drawer component
// ---------------------------------------------------------------------------

export default function BattleFilterDrawer() {
  const { filter, setFilter, resetFilter, toggleFilterOpen } = useBattleFilter();
  const { accounts } = useMonitoredAccountNames();
  const isMobile = useMediaQuery("(max-width:900px)");

  // Auto-select the first account when accounts load and none is set
  useEffect(() => {
    if (!filter.account && accounts.length > 0) {
      setFilter({ account: accounts[0] });
    }
  }, [accounts, filter.account, setFilter]);

  const drawerContent = (
    <Box
      sx={{
        width: DRAWER_WIDTH,
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
      role="complementary"
      aria-label="Battle filter"
    >
      {/* Sticky header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          bgcolor: "background.paper",
          zIndex: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <MdFilterList size={18} />
          <Typography variant="subtitle1" fontWeight={600}>
            Filter
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Reset filter">
            <IconButton size="small" onClick={() => resetFilter({ account: accounts[0] ?? "" })}>
              <MdRestartAlt size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close filter">
            <IconButton size="small" onClick={toggleFilterOpen}>
              <MdClose size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filter content */}
      <Box sx={{ p: 1.5, flex: 1 }}>
        {/* Account */}
        <FilterSection title="Account">
          <FormControl fullWidth size="small">
            <InputLabel>Account</InputLabel>
            <Select
              value={accounts.includes(filter.account) ? filter.account : ""}
              label="Account"
              onChange={(e) => setFilter({ account: e.target.value })}
            >
              {accounts.length === 0 && (
                <MenuItem value="" disabled>
                  No monitored accounts
                </MenuItem>
              )}
              {accounts.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </FilterSection>

        {/* Since */}
        <FilterSection title="Since">
          <FormControl fullWidth size="small">
            <InputLabel>Time range</InputLabel>
            <Select
              value={filter.sinceDays}
              label="Time range"
              onChange={(e) => setFilter({ sinceDays: Number(e.target.value) })}
            >
              {SINCE_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </FilterSection>

        <Divider sx={{ my: 1 }} />

        {/* Format */}
        <FilterSection title="Format">
          <IconFilterGroup
            options={FORMAT_OPTIONS}
            selected={filter.formats}
            onChange={(v) => setFilter({ formats: v as BattleFilter["formats"] })}
          />
        </FilterSection>

        {/* Match Type */}
        <FilterSection title="Match Type">
          <IconFilterGroup
            options={MATCH_TYPE_OPTIONS}
            selected={filter.matchTypes}
            onChange={(v) => setFilter({ matchTypes: v as BattleFilter["matchTypes"] })}
          />
        </FilterSection>

        <Divider sx={{ my: 1 }} />

        {/* Card Type (Archon / Unit) */}
        <FilterSection title="Card Type">
          <IconFilterGroup
            options={CARD_TYPE_OPTIONS}
            selected={filter.cardTypes}
            onChange={(v) => setFilter({ cardTypes: v as BattleFilter["cardTypes"] })}
          />
        </FilterSection>

        {/* Rarity */}
        <FilterSection title="Rarity">
          <IconFilterGroup
            options={RARITY_OPTIONS}
            selected={filter.rarities}
            onChange={(v) => setFilter({ rarities: v as BattleFilter["rarities"] })}
          />
        </FilterSection>

        {/* Element */}
        <FilterSection title="Element">
          <IconFilterGroup
            options={COLOR_OPTIONS}
            selected={filter.colors}
            onChange={(v) => setFilter({ colors: v as BattleFilter["colors"] })}
          />
        </FilterSection>

        {/* Edition */}
        <FilterSection title="Edition">
          <EditionSetFilter
            selectedEditions={filter.editions}
            onEditionsChange={(v) => setFilter({ editions: v })}
            selectedPromoTiers={filter.promoTiers}
            onPromoTiersChange={(v) => setFilter({ promoTiers: v })}
            selectedRewardTiers={filter.rewardTiers}
            onRewardTiersChange={(v) => setFilter({ rewardTiers: v })}
            selectedExtraTiers={filter.extraTiers}
            onExtraTiersChange={(v) => setFilter({ extraTiers: v })}
          />
        </FilterSection>

        <Divider sx={{ my: 1 }} />

        {/* Mana Cap */}
        <FilterSection title="Mana Cap">
          <Stack direction="row" spacing={1}>
            <TextField
              label="Min"
              type="number"
              size="small"
              value={filter.minManaCap || ""}
              onChange={(e) =>
                setFilter({ minManaCap: e.target.value ? parseInt(e.target.value) : 0 })
              }
              slotProps={{ htmlInput: { min: 0, max: 99 } }}
              sx={{ width: "50%" }}
            />
            <TextField
              label="Max"
              type="number"
              size="small"
              value={filter.maxManaCap || ""}
              onChange={(e) =>
                setFilter({ maxManaCap: e.target.value ? parseInt(e.target.value) : 0 })
              }
              slotProps={{ htmlInput: { min: 0, max: 99 } }}
              sx={{ width: "50%" }}
            />
          </Stack>
        </FilterSection>

        <Divider sx={{ my: 1 }} />

        {/* Display Options */}
        <FilterSection title="Display Options">
          <FormControlLabel
            control={
              <Switch
                checked={filter.groupLevels}
                onChange={(e) => setFilter({ groupLevels: e.target.checked })}
                size="small"
              />
            }
            label={<Typography variant="body2">Group card levels</Typography>}
            sx={{ mb: 1 }}
          />

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={filter.sortBy}
              label="Sort by"
              onChange={(e) => setFilter({ sortBy: e.target.value as BattleFilter["sortBy"] })}
            >
              {SORT_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>Top cards shown</InputLabel>
            <Select
              value={filter.topCount}
              label="Top cards shown"
              onChange={(e) => setFilter({ topCount: Number(e.target.value) })}
            >
              {TOP_COUNT_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  Top {n}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Min battles"
            type="number"
            size="small"
            fullWidth
            value={filter.minBattleCount}
            onChange={(e) =>
              setFilter({ minBattleCount: Math.max(1, parseInt(e.target.value) || 1) })
            }
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </FilterSection>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? "temporary" : "persistent"}
      anchor="right"
      open={filter.filterOpen}
      onClose={toggleFilterOpen}
      sx={{
        width: filter.filterOpen ? DRAWER_WIDTH : 0,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          top: APP_BAR_HEIGHT,
          height: `calc(100% - ${APP_BAR_HEIGHT}px)`,
          border: "none",
          borderLeft: 1,
          borderColor: "divider",
        },
      }}
      ModalProps={{ keepMounted: true }}
    >
      {drawerContent}
    </Drawer>
  );
}
