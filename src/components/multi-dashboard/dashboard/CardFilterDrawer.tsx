"use client";

import FilterSection from "@/components/shared/filter/FilterSection";
import IconFilterGroup from "@/components/shared/filter/IconFilterGroup";
import { SET_DEFS } from "@/lib/shared/edition-utils";
import {
  cardElementIconMap,
  cardElementOptions,
  cardIconMap,
  cardRarityOptions,
  cardRoleIconMap,
  cardRoleOptions,
  cardSetIconMap,
  cardSetOptions,
  type CardElement,
  type CardRarity,
  type CardRole,
  type CardSetName,
} from "@/types/card";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { MdClose, MdFilterList, MdRestartAlt } from "react-icons/md";

export const DRAWER_WIDTH = 280;

const MODERN_SETS: CardSetName[] = ["rebellion", "conclave", "foundation"];

// Build icon options from shared edition-utils so labels & icons stay in sync.
const setFilterOptions = cardSetOptions.map((name) => ({
  value: name as CardSetName,
  label: SET_DEFS.find((s) => s.setName === name)?.label ?? name,
  iconUrl: cardSetIconMap[name] ?? "",
}));

const rarityFilterOptions = cardRarityOptions.map((r) => ({
  value: r as CardRarity,
  label: r.charAt(0).toUpperCase() + r.slice(1),
  iconUrl: cardIconMap[r as CardRarity],
}));

const elementFilterOptions = cardElementOptions.map((e) => ({
  value: e as CardElement,
  label: e.charAt(0).toUpperCase() + e.slice(1),
  iconUrl: cardElementIconMap[e] ?? "",
}));

const roleFilterOptions = cardRoleOptions.map((r) => ({
  value: r as CardRole,
  label: r.charAt(0).toUpperCase() + r.slice(1),
  iconUrl: cardRoleIconMap[r as CardRole],
}));

interface CardFilterDrawerProps {
  open: boolean;
  onToggle: () => void;
  selectedSets: CardSetName[];
  selectedRarities: CardRarity[];
  selectedElements?: CardElement[];
  selectedRoles: CardRole[];
  hideMissingCards?: boolean;
  onSetChange: (sets: CardSetName[]) => void;
  onRarityChange: (rarities: CardRarity[]) => void;
  onElementChange?: (elements: CardElement[]) => void;
  onRoleChange?: (roles: CardRole[]) => void;
  onHideMissingCardsChange?: (hide: boolean) => void;
}

export function CardFilterDrawer({
  open,
  onToggle,
  selectedSets,
  selectedRarities,
  selectedElements = [],
  selectedRoles,
  hideMissingCards,
  onSetChange,
  onRarityChange,
  onElementChange,
  onRoleChange,
  onHideMissingCardsChange,
}: CardFilterDrawerProps) {
  const handleReset = () => {
    onSetChange([]);
    onRarityChange([]);
    onElementChange?.([]);
    onRoleChange?.([]);
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          Filters
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Reset filter">
            <IconButton size="small" onClick={handleReset}>
              <MdRestartAlt size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close filter">
            <IconButton size="small" onClick={onToggle}>
              <MdClose size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filter content */}
      <Box sx={{ p: 1.5, flex: 1, overflowY: "auto" }}>
        {/* Card Set — with Modern / Wild quick-select */}
        <FilterSection title="Card Set">
          <Stack direction="row" spacing={0.75} sx={{ mb: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onSetChange(MODERN_SETS)}
              sx={{ flex: 1, textTransform: "none", fontSize: 12, py: 0.25 }}
            >
              Modern
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => onSetChange([])}
              sx={{ flex: 1, textTransform: "none", fontSize: 12, py: 0.25 }}
            >
              Wild (all)
            </Button>
          </Stack>
          <IconFilterGroup<CardSetName>
            options={setFilterOptions}
            selected={selectedSets}
            onChange={onSetChange}
          />
        </FilterSection>

        <Divider sx={{ my: 1 }} />

        {/* Rarity */}
        <FilterSection title="Rarity">
          <IconFilterGroup<CardRarity>
            options={rarityFilterOptions}
            selected={selectedRarities}
            onChange={onRarityChange}
          />
        </FilterSection>

        {/* Element */}
        <FilterSection title="Element">
          <IconFilterGroup<CardElement>
            options={elementFilterOptions}
            selected={selectedElements}
            onChange={(v) => onElementChange?.(v)}
          />
        </FilterSection>

        {/* Role */}
        <FilterSection title="Role">
          <IconFilterGroup<CardRole>
            options={roleFilterOptions}
            selected={selectedRoles}
            onChange={(v) => onRoleChange?.(v)}
          />
        </FilterSection>

        <Divider sx={{ my: 1 }} />

        {/* Display Options */}
        <FilterSection title="Display Options">
          <FormControlLabel
            control={
              <Switch
                checked={hideMissingCards ?? false}
                onChange={(e) => onHideMissingCardsChange?.(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">Hide missing cards</Typography>}
          />
        </FilterSection>
      </Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="persistent"
        anchor="right"
        open={open}
        sx={{
          width: open ? DRAWER_WIDTH : 0,
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

      {!open && (
        <Tooltip title="Open filter" placement="left">
          <IconButton
            onClick={onToggle}
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
