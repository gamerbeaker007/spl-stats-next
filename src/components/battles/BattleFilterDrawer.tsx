"use client";

import { useBattleFilter } from "@/lib/frontend/context/BattleFilterContext";
import { useCardOptions, type CardOption } from "@/hooks/battles/useCardOptions";
import IconFilterGroup from "@/components/shared/filter/IconFilterGroup";
import FilterSection from "@/components/shared/filter/FilterSection";
import EditionSetFilter from "@/components/shared/filter/EditionSetFilter";
import {
  CARD_TYPE_OPTIONS,
  COLOR_OPTIONS,
  FORMAT_OPTIONS,
  MATCH_TYPE_OPTIONS,
  RARITY_OPTIONS,
  SINCE_OPTIONS,
  SORT_OPTIONS,
  TOP_COUNT_OPTIONS,
  type BattleFilter,
} from "@/types/battles";
import Button from "@mui/material/Button";
import { useMonitoredAccountNames } from "@/hooks/battles/useMonitoredAccountNames";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
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
import { useEffect } from "react";
import { MdClose, MdFilterList, MdRestartAlt } from "react-icons/md";

export const DRAWER_WIDTH = 280;

// ---------------------------------------------------------------------------
// Main drawer component
// ---------------------------------------------------------------------------

export default function BattleFilterDrawer({
  showGroupLevels = true,
}: {
  showGroupLevels?: boolean;
}) {
  const { filter, setFilter, resetFilter, toggleFilterOpen } = useBattleFilter();
  const { accounts } = useMonitoredAccountNames();
  const { cards: cardOptions, loading: cardOptionsLoading } = useCardOptions(filter.account);
  const isMobile = useMediaQuery("(max-width:900px)");

  // Derive the currently selected Autocomplete value; synthesise a stub while options load
  const selectedCard: CardOption | null = filter.selectedCardDetailId
    ? (cardOptions.find((o) => o.cardDetailId === filter.selectedCardDetailId) ?? {
        cardDetailId: filter.selectedCardDetailId,
        cardName: filter.cardName,
      })
    : null;

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

        {/* Card Name */}
        <FilterSection title="Card">
          <Autocomplete<CardOption>
            options={cardOptions}
            getOptionLabel={(o) => o.cardName}
            filterOptions={(options, { inputValue }) => {
              const lower = inputValue.toLowerCase();
              return options.filter((o) => o.cardName.toLowerCase().includes(lower)).slice(0, 5);
            }}
            isOptionEqualToValue={(o, v) => o.cardDetailId === v.cardDetailId}
            value={selectedCard}
            onChange={(_, newValue) => {
              setFilter({
                cardName: newValue?.cardName ?? "",
                selectedCardDetailId: newValue?.cardDetailId ?? 0,
              });
            }}
            loading={cardOptionsLoading}
            disabled={!filter.account}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Search card"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {cardOptionsLoading && <CircularProgress size={16} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
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
          {showGroupLevels && (
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
          )}

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
    <>
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

      {!filter.filterOpen && (
        <Tooltip title="Open filter" placement="left">
          <IconButton
            onClick={toggleFilterOpen}
            sx={{
              position: "fixed",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              bgcolor: "error.main",
              color: "#fff",
              borderRadius: "4px 0 0 4px",
              zIndex: 1200,
              border: 1,
              borderRight: 0,
              borderColor: "error.dark",
              "&:hover": { bgcolor: "error.dark" },
            }}
          >
            <MdFilterList size={24} />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
