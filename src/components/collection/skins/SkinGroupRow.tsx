"use client";

import type { MarketActionMode } from "@/components/collection/marketplace/MarketActionDialogHost";
import { SkinCardGrid } from "@/components/collection/skins/SkinCardGrid";
import { resolveGroupBaseSkin } from "@/lib/shared/skin-groups";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import type { SkinCardPresentation, SkinGroupViewModel } from "@/types/skins";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { MdCheckCircle } from "react-icons/md";

interface SkinGroupRowProps {
  row: SkinGroupViewModel;
  presentation: SkinCardPresentation;
}

interface BaseSkinCardProps {
  row: SkinGroupViewModel;
  image: string;
  active: boolean;
  isAuthenticated: boolean;
  onActivate: (mode: MarketActionMode, item: MarketplaceAssetItem) => void;
  baseSkinItem: MarketplaceAssetItem;
}

/** The unskinned card, rendered as the first tile of a group with its activate button. */
function BaseSkinCard({
  row,
  image,
  active,
  isAuthenticated,
  onActivate,
  baseSkinItem,
}: Readonly<BaseSkinCardProps>) {
  return (
    <Box
      sx={{
        borderRadius: 2,
        border: active ? 2 : 1,
        borderColor: active ? "success.main" : "divider",
        backgroundColor: "background.paper",
        boxShadow: active ? "0 0 0 1px rgba(76, 175, 80, 0.15)" : "none",

        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Stack spacing={2.5} alignItems="center" sx={{ width: "100%", height: "100%", p: 1 }}>
        <Typography variant="h6" align="center" sx={{ width: "100%" }}>
          {row.group.groupName}
        </Typography>

        <Box
          component="img"
          src={image}
          alt={row.group.groupName}
          sx={{
            width: "100%",
            maxWidth: 210,
            height: 220,
            objectFit: "contain",
            opacity: isAuthenticated && row.totalOwnedCards < 1 ? 0.5 : 1,
          }}
        />

        {/* This spacer consumes all remaining height */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Always at bottom */}
        <Stack spacing={1} alignItems="center" sx={{ width: "100%" }}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center">
            <Chip label={`${row.visibleSkins.length} visible skins`} size="small" />

            {isAuthenticated && (
              <Chip
                label={`${row.totalOwnedSkins} skins owned`}
                color={row.totalOwnedSkins > 0 ? "success" : "default"}
                size="small"
              />
            )}
          </Stack>

          <Button
            variant="outlined"
            size="small"
            title="List"
            color={active ? "warning" : "primary"}
            disabled={!isAuthenticated || active}
            onClick={() => onActivate("activate", baseSkinItem)}
          >
            <MdCheckCircle style={{ width: "150px", height: "1.1rem" }} />
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

/** One base card next to the skins that belong to it. */
export function SkinGroupRow({ row, presentation }: Readonly<SkinGroupRowProps>) {
  const { baseCardImage, baseSkinActive, baseSkinItem } = resolveGroupBaseSkin(row.group, row.card);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "240px 1fr" },
        gap: { xs: 2, lg: 3 },
        alignItems: "stretch",
      }}
    >
      <BaseSkinCard
        row={row}
        image={baseCardImage}
        active={baseSkinActive}
        isAuthenticated={presentation.isAuthenticated}
        onActivate={presentation.onAction}
        baseSkinItem={baseSkinItem}
      />

      <SkinCardGrid
        skins={row.visibleSkins}
        presentation={presentation}
        alignContent="flex-start"
      />
    </Box>
  );
}
