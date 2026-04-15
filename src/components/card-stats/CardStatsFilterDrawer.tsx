"use client";

import { useCardStatsFilter } from "@/lib/frontend/context/CardStatsFilterContext";
import EditionSetFilter from "@/components/shared/filter/EditionSetFilter";
import FilterSection from "@/components/shared/filter/FilterSection";
import FoilFilterChips, { type FoilOption } from "@/components/shared/filter/FoilFilterChips";
import IconFilterGroup from "@/components/shared/filter/IconFilterGroup";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { CARD_TYPE_OPTIONS, COLOR_OPTIONS, RARITY_OPTIONS } from "@/types/battles";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { MdClose, MdFilterList, MdRestartAlt } from "react-icons/md";

export const DRAWER_WIDTH = 280;

export const CARD_STATS_FOIL_OPTIONS: FoilOption[] = [
  { value: "regular", label: "R", color: "#9e9e9e", textColor: "#fff" },
  { value: "gold", label: "G", color: "#ffc107", textColor: "#5d4000" },
  { value: "gold-arcane", label: "GV", color: "#ff8f00", textColor: "#fff" },
  { value: "black", label: "B", color: "#424242", textColor: "#fff" },
  { value: "black-arcane", label: "BV", color: "#607d8b", textColor: "#fff" },
];

export default function CardStatsFilterDrawer() {
  const { filter, setFilter, resetFilter, toggleFilterOpen } = useCardStatsFilter();
  const isMobile = useMediaQuery("(max-width:900px)");

  const toggleFoil = (cats: string[]) => setFilter({ foilCategories: cats as never });

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
      aria-label="Card stats filter"
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

      {/* Filter content */}
      <Box sx={{ p: 1.5, flex: 1 }}>
        {/* Card Type */}
        <FilterSection title="Card Type">
          <IconFilterGroup
            options={CARD_TYPE_OPTIONS}
            selected={filter.cardTypes}
            onChange={(v) => setFilter({ cardTypes: v as string[] })}
          />
        </FilterSection>

        {/* Rarity */}
        <FilterSection title="Rarity">
          <IconFilterGroup
            options={RARITY_OPTIONS}
            selected={filter.rarities}
            onChange={(v) => setFilter({ rarities: v as number[] })}
          />
        </FilterSection>

        {/* Element */}
        <FilterSection title="Element">
          <IconFilterGroup
            options={COLOR_OPTIONS}
            selected={filter.colors}
            onChange={(v) => setFilter({ colors: v as string[] })}
          />
        </FilterSection>

        <Divider sx={{ my: 1 }} />

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

        {/* Foil */}
        <FilterSection title="Foil">
          <FoilFilterChips
            options={CARD_STATS_FOIL_OPTIONS}
            selected={filter.foilCategories}
            onChange={toggleFoil}
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
