"use client";

import CardSearchAutocomplete from "@/components/shared/filter/CardSearchAutocomplete";
import EditionSetFilter from "@/components/shared/filter/EditionSetFilter";
import FilterPanelShell from "@/components/shared/filter/FilterPanelShell";
import FilterSection from "@/components/shared/filter/FilterSection";
import FoilFilterChips from "@/components/shared/filter/FoilFilterChips";
import IconFilterGroup from "@/components/shared/filter/IconFilterGroup";
import { useAllCardOptions } from "@/hooks/useAllCardOptions";
import { countActiveFilters } from "@/lib/shared/active-filter-count";
import { abilityIconUrl } from "@/lib/shared/card-utils";
import {
  CARD_TYPE_OPTIONS,
  COLOR_OPTIONS,
  FORMAT_OPTIONS,
  MATCH_TYPE_OPTIONS,
  RARITY_OPTIONS,
  SINCE_OPTIONS,
  SORT_OPTIONS,
  TOP_COUNT_OPTIONS,
} from "@/types/battles";
import type { CardFoil, CardOption } from "@/types/card";
import type { FilterDrawerConfig, UnifiedCardFilter } from "@/types/card-filter";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";

interface Props {
  filter: UnifiedCardFilter;
  setFilter: (updates: Partial<UnifiedCardFilter>) => void;
  resetFilter: () => void;
  toggleFilterOpen: () => void;
  config: FilterDrawerConfig;
  accounts?: string[];
  /**
   * Options for the card search (`config.showCardSearch`). Omit to search every
   * card in the game. Pass an array (even an empty one) to restrict the search,
   * e.g. to the cards an account has played.
   */
  cardOptions?: CardOption[];
  cardOptionsLoading?: boolean;
}

interface CardSearchFieldProps {
  filter: UnifiedCardFilter;
  setFilter: (updates: Partial<UnifiedCardFilter>) => void;
  options: CardOption[];
  loading: boolean;
  disabled?: boolean;
}

function CardSearchField({
  filter,
  setFilter,
  options,
  loading,
  disabled,
}: Readonly<CardSearchFieldProps>) {
  const selectedIds =
    filter.selectedCardDetailIds?.length > 0
      ? filter.selectedCardDetailIds
      : filter.selectedCardDetailId > 0
        ? [filter.selectedCardDetailId]
        : [];
  const selectedCards = selectedIds.map(
    (id) =>
      options.find((option) => option.cardDetailId === id) ?? {
        cardDetailId: id,
        cardName: id === filter.selectedCardDetailId ? filter.cardName : `Card ${id}`,
      }
  );

  const setSelectedCards = (cards: CardOption[]) => {
    const ids = cards.map((card) => card.cardDetailId);
    setFilter({
      selectedCardDetailIds: ids,
      selectedCardDetailId: ids[0] ?? 0,
      cardName: cards.length === 1 ? cards[0].cardName : "",
    });
  };

  return (
    <Box>
      <CardSearchAutocomplete
        options={options}
        loading={loading}
        value={selectedCards}
        onChange={setSelectedCards}
        disabled={disabled}
      />
      {selectedCards.length > 0 && (
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} sx={{ mt: 1 }}>
          {selectedCards.map((card) => (
            <Chip
              key={card.cardDetailId}
              label={card.cardName}
              size="small"
              onDelete={() =>
                setSelectedCards(
                  selectedCards.filter((item) => item.cardDetailId !== card.cardDetailId)
                )
              }
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

/** Card search over every card in the game — only mounted when no options are given, so only then fetched. */
function AllCardsSearchField(props: Readonly<Omit<CardSearchFieldProps, "options" | "loading">>) {
  const { cards, loading } = useAllCardOptions();
  return <CardSearchField {...props} options={cards} loading={loading} />;
}

function CardMetadataFilters({
  filter,
  setFilter,
  showBloodlines,
  showAbilities,
}: Readonly<{
  filter: UnifiedCardFilter;
  setFilter: (updates: Partial<UnifiedCardFilter>) => void;
  showBloodlines: boolean;
  showAbilities: boolean;
}>) {
  const { cards: allCards } = useAllCardOptions();
  const options = allCards;
  const bloodlines = Array.from(new Set(options.map((card) => card.subType).filter(Boolean))).sort(
    (a, b) => a!.localeCompare(b!)
  ) as string[];
  const abilities = Array.from(
    new Set(options.flatMap((card) => card.abilities ?? []).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <>
      {showBloodlines && (
        <FilterSection title="Bloodline">
          <Autocomplete<string, true>
            multiple
            options={bloodlines}
            value={filter.bloodlines}
            onChange={(_, value) => setFilter({ bloodlines: value })}
            renderValue={() => null}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Search bloodlines" />
            )}
          />
          {filter.bloodlines.length > 0 && (
            <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} sx={{ mt: 1 }}>
              {filter.bloodlines.map((bloodline) => (
                <Chip
                  key={bloodline}
                  label={bloodline}
                  size="small"
                  onDelete={() =>
                    setFilter({
                      bloodlines: filter.bloodlines.filter((item) => item !== bloodline),
                    })
                  }
                />
              ))}
            </Stack>
          )}
        </FilterSection>
      )}
      {showAbilities && (
        <FilterSection title="Abilities">
          <Autocomplete<string, true>
            multiple
            options={abilities}
            value={filter.abilities}
            onChange={(_, value) => setFilter({ abilities: value })}
            renderValue={() => null}
            renderOption={(props, ability) => (
              <Box
                component="li"
                {...props}
                key={ability}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Avatar key={ability} src={abilityIconUrl(ability)} alt="" />
                {ability}
              </Box>
            )}
            renderInput={(params) => (
              <TextField {...params} size="small" label="Search abilities" />
            )}
          />
          {filter.abilities.length > 0 && (
            <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} sx={{ mt: 1 }}>
              {filter.abilities.map((ability) => (
                <Chip
                  key={ability}
                  label={ability}
                  size="small"
                  avatar={<Avatar key={ability} src={abilityIconUrl(ability)} alt="" />}
                  onDelete={() =>
                    setFilter({ abilities: filter.abilities.filter((item) => item !== ability) })
                  }
                />
              ))}
            </Stack>
          )}
        </FilterSection>
      )}
    </>
  );
}

export default function UnifiedCardFilterDrawer({
  filter,
  setFilter,
  resetFilter,
  toggleFilterOpen,
  config,
  accounts = [],
  cardOptions,
  cardOptionsLoading = false,
}: Props) {
  // Badges the toggle button so a closed panel still explains why the data is
  // narrowed — the single most common "where did my cards go?" confusion.
  const activeCount = useMemo(() => countActiveFilters(filter, config), [filter, config]);

  // Group visibility — drives conditional dividers
  const hasGroup1 = !!(config.showAccount || config.showSinceDays || config.showCardSearch);
  const hasGroup2 = !!(config.showFormats || config.showMatchTypes);
  const hasGroup3 = !!(
    config.showCardTypes ||
    config.showRarities ||
    config.showColors ||
    config.showEditions ||
    config.showFoils ||
    config.showBloodlines ||
    config.showAbilities
  );
  const hasGroup4 = !!config.showMana;
  const hasGroup5 = !!(
    config.showHideMissing ||
    config.showSorting ||
    config.showGrouping ||
    config.showTopCount ||
    config.showMinBattleCount
  );

  const filterBody = (
    <>
      {/* ── Group 1: battle context (account / time range / card search) ── */}
      {config.showAccount && (
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
      )}

      {config.showSinceDays && (
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
      )}

      {config.showCardSearch && (
        <>
          <FilterSection title="Card">
            {cardOptions ? (
              <CardSearchField
                filter={filter}
                setFilter={setFilter}
                options={cardOptions}
                loading={cardOptionsLoading}
                disabled={config.showAccount && !filter.account}
              />
            ) : (
              <AllCardsSearchField
                filter={filter}
                setFilter={setFilter}
                disabled={config.showAccount && !filter.account}
              />
            )}
          </FilterSection>
          {(config.showBloodlines || config.showAbilities) && (
            <CardMetadataFilters
              filter={filter}
              setFilter={setFilter}
              showBloodlines={!!config.showBloodlines}
              showAbilities={!!config.showAbilities}
            />
          )}
        </>
      )}

      {hasGroup1 && hasGroup2 && <Divider sx={{ my: 1 }} />}

      {/* ── Group 2: battle match (format / match type) ── */}
      {config.showFormats && (
        <FilterSection title="Format">
          <IconFilterGroup
            options={FORMAT_OPTIONS}
            selected={filter.formats}
            onChange={(v) => setFilter({ formats: v as string[] })}
          />
        </FilterSection>
      )}

      {config.showMatchTypes && (
        <FilterSection title="Match Type">
          <IconFilterGroup
            options={MATCH_TYPE_OPTIONS}
            selected={filter.matchTypes}
            onChange={(v) => setFilter({ matchTypes: v as string[] })}
          />
        </FilterSection>
      )}

      {(hasGroup1 || hasGroup2) && hasGroup3 && <Divider sx={{ my: 1 }} />}

      {/* ── Group 3: card attributes ── */}
      {config.showCardTypes && (
        <FilterSection title="Card Type">
          <IconFilterGroup
            options={CARD_TYPE_OPTIONS}
            selected={filter.cardTypes}
            onChange={(v) => setFilter({ cardTypes: v as string[] })}
          />
        </FilterSection>
      )}

      {config.showRarities && (
        <FilterSection title="Rarity">
          <IconFilterGroup
            options={RARITY_OPTIONS}
            selected={filter.rarities}
            onChange={(v) => setFilter({ rarities: v as number[] })}
          />
        </FilterSection>
      )}

      {config.showColors && (
        <FilterSection title="Element">
          <IconFilterGroup
            options={COLOR_OPTIONS}
            selected={filter.colors}
            onChange={(v) => setFilter({ colors: v as string[] })}
          />
        </FilterSection>
      )}

      {config.showEditions && (
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
            selectedBetaOrbPromo={filter.betaOrbPromo}
            onBetaOrbPromoChange={(v) => setFilter({ betaOrbPromo: v })}
            onSelectionChange={(v) => setFilter(v)}
          />
        </FilterSection>
      )}

      {config.showFoils && (
        <FilterSection title="Foil">
          <FoilFilterChips
            selected={filter.foilCategories}
            onChange={(v) => setFilter({ foilCategories: v as CardFoil[] })}
          />
        </FilterSection>
      )}

      {hasGroup3 && hasGroup4 && <Divider sx={{ my: 1 }} />}

      {/* ── Group 4: match conditions (mana cap) ── */}
      {config.showMana && (
        <FilterSection title="Mana Cap">
          <Stack direction="row" spacing={1}>
            <TextField
              label="Min"
              type="number"
              size="small"
              value={filter.minManaCap || ""}
              onChange={(e) =>
                setFilter({ minManaCap: e.target.value ? Number.parseInt(e.target.value) : 0 })
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
                setFilter({ maxManaCap: e.target.value ? Number.parseInt(e.target.value) : 0 })
              }
              slotProps={{ htmlInput: { min: 0, max: 99 } }}
              sx={{ width: "50%" }}
            />
          </Stack>
        </FilterSection>
      )}

      {(hasGroup3 || hasGroup4) && hasGroup5 && <Divider sx={{ my: 1 }} />}

      {/* ── Group 5: display options ── */}
      {hasGroup5 && (
        <FilterSection title="Display Options">
          {config.showHideMissing && (
            // Nothing selected = show owned + missing cards.
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={filter.missingCards === "all" ? null : filter.missingCards}
              onChange={(_, value: "hide" | "only" | null) =>
                setFilter({ missingCards: value ?? "all" })
              }
              aria-label="Missing cards"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="hide">Hide missing</ToggleButton>
              <ToggleButton value="only">Only missing</ToggleButton>
            </ToggleButtonGroup>
          )}

          {config.showGrouping && (
            <>
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
              <FormControlLabel
                control={
                  <Switch
                    checked={filter.groupFoils}
                    onChange={(e) => setFilter({ groupFoils: e.target.checked })}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Group card foils</Typography>}
                sx={{ mb: 1 }}
              />
            </>
          )}

          {config.showSorting && (
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel>Sort by</InputLabel>
              <Select
                value={filter.sortBy}
                label="Sort by"
                onChange={(e) =>
                  setFilter({ sortBy: e.target.value as UnifiedCardFilter["sortBy"] })
                }
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {config.showTopCount && (
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
          )}

          {config.showMinBattleCount && (
            <TextField
              label="Min battles"
              type="number"
              size="small"
              fullWidth
              value={filter.minBattleCount}
              onChange={(e) =>
                setFilter({ minBattleCount: Math.max(1, Number.parseInt(e.target.value) || 1) })
              }
              slotProps={{ htmlInput: { min: 1 } }}
            />
          )}
        </FilterSection>
      )}
    </>
  );

  return (
    <FilterPanelShell
      open={filter.filterOpen}
      onToggle={toggleFilterOpen}
      onReset={resetFilter}
      activeCount={activeCount}
      ariaLabel={config.ariaLabel ?? "Filter"}
    >
      {filterBody}
    </FilterPanelShell>
  );
}
