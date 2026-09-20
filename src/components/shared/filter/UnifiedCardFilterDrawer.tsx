"use client";

import CardSearchAutocomplete from "@/components/shared/filter/CardSearchAutocomplete";
import EditionSetFilter from "@/components/shared/filter/EditionSetFilter";
import FilterSection from "@/components/shared/filter/FilterSection";
import FoilFilterChips from "@/components/shared/filter/FoilFilterChips";
import IconFilterGroup from "@/components/shared/filter/IconFilterGroup";
import {
  FILTER_PANEL_MOBILE_QUERY,
  FILTER_PANEL_WIDTH,
  FILTER_PANEL_WIDTH_VAR,
} from "@/components/shared/filter/filterPanelLayout";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { countActiveFilters } from "@/lib/shared/active-filter-count";
import type { FilterDrawerConfig, UnifiedCardFilter } from "@/types/card-filter";
import type { CardFoil, CardOption } from "@/types/card";
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
import Badge from "@mui/material/Badge";
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
import { useEffect, useMemo } from "react";
import { MdClose, MdFilterList, MdRestartAlt } from "react-icons/md";

/** @deprecated Use FILTER_PANEL_WIDTH from `./filterPanelLayout`. */
export const DRAWER_WIDTH = FILTER_PANEL_WIDTH;

interface Props {
  filter: UnifiedCardFilter;
  setFilter: (updates: Partial<UnifiedCardFilter>) => void;
  resetFilter: () => void;
  toggleFilterOpen: () => void;
  config: FilterDrawerConfig;
  accounts?: string[];
  cardOptions?: CardOption[];
  cardOptionsLoading?: boolean;
}

export default function UnifiedCardFilterDrawer({
  filter,
  setFilter,
  resetFilter,
  toggleFilterOpen,
  config,
  accounts = [],
  cardOptions = [],
  cardOptionsLoading = false,
}: Props) {
  const isMobile = useMediaQuery(FILTER_PANEL_MOBILE_QUERY);

  // Docked only on desktop: there the panel is a real side panel and `main`
  // narrows around it. On mobile it stays an overlay drawer — there is no room
  // to dock without squeezing the content to nothing.
  const docked = !isMobile && filter.filterOpen;

  // The open state is persisted, so a session that ended docked on desktop
  // would otherwise reopen as a full-screen modal overlay on a phone.
  useEffect(() => {
    if (isMobile && filter.filterOpen) toggleFilterOpen();
    // Only react to the breakpoint — reopening on mobile is a deliberate user action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Publish the docked width so `NavShell` can reserve room for the panel.
  // Reset to 0 on unmount, otherwise leaving a filtered page would leave `main`
  // permanently indented.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(FILTER_PANEL_WIDTH_VAR, docked ? `${FILTER_PANEL_WIDTH}px` : "0px");
    return () => root.style.setProperty(FILTER_PANEL_WIDTH_VAR, "0px");
  }, [docked]);

  // Badges the toggle button so a closed panel still explains why the data is
  // narrowed — the single most common "where did my cards go?" confusion.
  const activeCount = useMemo(() => countActiveFilters(filter, config), [filter, config]);

  const selectedCard: CardOption | null = filter.selectedCardDetailId
    ? (cardOptions.find((o) => o.cardDetailId === filter.selectedCardDetailId) ?? {
        cardDetailId: filter.selectedCardDetailId,
        cardName: filter.cardName,
      })
    : null;

  // Group visibility — drives conditional dividers
  const hasGroup1 = !!(config.showAccount || config.showSinceDays || config.showCardSearch);
  const hasGroup2 = !!(config.showFormats || config.showMatchTypes);
  const hasGroup3 = !!(
    config.showCardTypes ||
    config.showRarities ||
    config.showColors ||
    config.showEditions ||
    config.showFoils
  );
  const hasGroup4 = !!config.showMana;
  const hasGroup5 = !!(
    config.showHideMissing ||
    config.showSorting ||
    config.showGrouping ||
    config.showTopCount ||
    config.showMinBattleCount
  );

  const drawerContent = (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
      role="complementary"
      aria-label={config.ariaLabel ?? "Filter"}
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
          {activeCount > 0 && (
            <Typography
              variant="caption"
              sx={{
                px: 0.75,
                py: 0.125,
                borderRadius: 10,
                bgcolor: "error.main",
                color: "error.contrastText",
                fontWeight: 700,
                lineHeight: 1.6,
              }}
            >
              {activeCount}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Reset filter">
            <IconButton size="small" onClick={resetFilter}>
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

      <Box sx={{ p: 1.5, flex: 1 }}>
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
          <FilterSection title="Card">
            <CardSearchAutocomplete
              options={cardOptions}
              loading={cardOptionsLoading}
              value={selectedCard}
              onChange={(v) =>
                setFilter({
                  cardName: v?.cardName ?? "",
                  selectedCardDetailId: v?.cardDetailId ?? 0,
                })
              }
              disabled={config.showAccount && !filter.account}
            />
          </FilterSection>
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
              <FormControlLabel
                control={
                  <Switch
                    checked={filter.hideMissingCards}
                    onChange={(e) => setFilter({ hideMissingCards: e.target.checked })}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Hide missing cards</Typography>}
                sx={{ mb: 1 }}
              />
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
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        anchor="right"
        open={filter.filterOpen}
        onClose={toggleFilterOpen}
        sx={{
          // The docked panel must not claim layout width here — it is fixed
          // positioned, and `NavShell` reserves the space on `main` instead.
          width: 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile ? `min(88vw, ${FILTER_PANEL_WIDTH}px)` : FILTER_PANEL_WIDTH,
            boxSizing: "border-box",
            top: APP_BAR_HEIGHT,
            height: `calc(100% - ${APP_BAR_HEIGHT}px)`,
            border: "none",
            borderLeft: 1,
            borderColor: "divider",
            backgroundImage: "none",
          },
        }}
        ModalProps={{ keepMounted: true }}
      >
        {drawerContent}
      </Drawer>

      {!filter.filterOpen && (
        <Tooltip
          title={activeCount > 0 ? `Open filter (${activeCount} active)` : "Open filter"}
          placement="left"
        >
          {/* The Badge carries the fixed positioning: anchoring it on the button
              instead would place the counter relative to a static box, and at
              right: 0 it would be clipped off the edge of the viewport. */}
          <Badge
            badgeContent={activeCount}
            color="primary"
            overlap="circular"
            anchorOrigin={{ vertical: "top", horizontal: "left" }}
            sx={{
              position: "fixed",
              right: 0,
              top: `${APP_BAR_HEIGHT + 70}px`,
              zIndex: 1200,
              "& .MuiBadge-badge": {
                border: "2px solid",
                borderColor: "background.default",
              },
            }}
          >
            <IconButton
              aria-label={activeCount > 0 ? `Open filter, ${activeCount} active` : "Open filter"}
              onClick={toggleFilterOpen}
              sx={{
                bgcolor: "error.main",
                color: "#fff",
                borderRadius: "4px 0 0 4px",
                border: 1,
                borderRight: 0,
                borderColor: "error.dark",
                "&:hover": { bgcolor: "error.dark" },
              }}
            >
              <MdFilterList size={24} />
            </IconButton>
          </Badge>
        </Tooltip>
      )}
    </>
  );
}
