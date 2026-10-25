"use client";

import { LivePriceValue } from "@/components/collection/cards/LivePrice";

import {
  LandDetailIcons,
  LandResourceIcons,
  LandTerrainIcon,
} from "@/components/collection/land-market/LandAttributeIcons";
import LandCartButton from "@/components/collection/land-market/LandCartButton";
import LandDeedImage from "@/components/collection/land-market/LandDeedImage";
import LandIcon from "@/components/collection/land-market/LandIcon";
import type { LandCartState } from "@/hooks/land-market/useLandCart";
import {
  LAND_TYPE_LABELS,
  capitalize,
  formatLandPriceUsd,
  formatListingAge,
  getLandMagicTypeIconUrl,
  getLandRarityColor,
  getLandRarityIconUrl,
  getLandTypeIconUrl,
  getLandWorksiteDef,
} from "@/lib/shared/land-deed-utils";
import type { LandMarketListing } from "@/types/land/landMarket";
import { Box, Stack, Tooltip, Typography, alpha } from "@mui/material";

/** Matches the CDN deed artwork (800×422). */
const ARTWORK_ASPECT_RATIO = "800 / 422";

const OVERLAY_TEXT_SHADOW = "0 1px 3px rgba(0,0,0,0.9)";

const badgeSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  px: 0.75,
  py: 0.25,
  borderRadius: 1,
  bgcolor: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(4px)",
  color: "#fff",
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  lineHeight: 1.4,
} as const;

interface LandMarketCardProps {
  listing: LandMarketListing;
  cartState: LandCartState;
  onToggleCart: () => void;
  decPriceUsd: number | null;
  now: number;
}

/** Image-first marketplace tile for one land deed listing. */
export default function LandMarketCard({
  listing,
  cartState,
  onToggleCart,
  decPriceUsd,
  now,
}: Readonly<LandMarketCardProps>) {
  const rarityColor = getLandRarityColor(listing.rarity);
  const highTier = listing.rarity === "legendary" || listing.rarity === "mythic";
  const worksite = getLandWorksiteDef(listing.worksite);
  const inCart = cartState.inCartFor !== null;

  return (
    <Box
      component="article"
      aria-label={`Land ${listing.location}`}
      sx={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        border: 1,
        borderColor: inCart ? "success.main" : alpha(rarityColor, 0.6),
        boxShadow: highTier ? `0 0 14px ${alpha(rarityColor, 0.45)}` : 1,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 6px 18px ${alpha(rarityColor, highTier ? 0.6 : 0.3)}`,
        },
      }}
    >
      {/* Artwork with overlays */}
      <Box sx={{ position: "relative", aspectRatio: ARTWORK_ASPECT_RATIO, bgcolor: "grey.900" }}>
        <LandDeedImage
          src={listing.imageUrl}
          alt={`Deed artwork ${listing.location}`}
          sx={{ width: "100%", height: "100%" }}
        />

        {/* Top row — kept clear of the artwork's own emblem in the top-left corner. */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ position: "absolute", top: "7%", left: "11%", right: "3%" }}
        >
          {listing.rarity ? (
            <Box sx={{ ...badgeSx, bgcolor: alpha(rarityColor, 0.85) }}>
              <Box
                component="img"
                src={getLandRarityIconUrl(listing.rarity)}
                alt=""
                sx={{ width: 14, height: 14 }}
              />
              {listing.rarity}
            </Box>
          ) : (
            <Box sx={badgeSx}>Unsurveyed</Box>
          )}

          {listing.landType && (
            <Tooltip
              title={
                listing.magicType
                  ? `${LAND_TYPE_LABELS[listing.landType]} — ${capitalize(listing.magicType)}`
                  : LAND_TYPE_LABELS[listing.landType]
              }
            >
              <Box sx={badgeSx} tabIndex={0}>
                <Box
                  component="img"
                  src={getLandTypeIconUrl(listing.landType)}
                  alt=""
                  sx={{ width: 14, height: 14, objectFit: "contain" }}
                />
                {LAND_TYPE_LABELS[listing.landType]}
                {listing.magicType && (
                  <Box
                    component="img"
                    src={getLandMagicTypeIconUrl(listing.magicType)}
                    alt={capitalize(listing.magicType)}
                    sx={{ width: 14, height: 14, objectFit: "contain" }}
                  />
                )}
              </Box>
            </Tooltip>
          )}
        </Stack>

        {/* Bottom gradient: region + location */}
        <Box
          sx={{
            position: "absolute",
            inset: "auto 0 0 0",
            px: 1.5,
            pt: 4,
            pb: 1,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 55%, transparent 100%)",
            color: "#fff",
            textShadow: OVERLAY_TEXT_SHADOW,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}>
              <LandTerrainIcon listing={listing} size={20} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {listing.regionName || "Unknown region"} #{listing.regionNumber}
            </Typography>
          </Stack>
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", fontWeight: 600, letterSpacing: 0.4 }}
          >
            {listing.location}
          </Typography>
        </Box>
      </Box>

      {/* Details */}
      <Stack spacing={1} sx={{ p: 1.25, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 28 }}>
          <LandResourceIcons listing={listing} size={20} />
          <Box sx={{ flex: 1 }} />
          {worksite ? (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
              <LandIcon src={worksite.iconUrl} label={worksite.label} size={24} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {worksite.label}
              </Typography>
            </Stack>
          ) : (
            <Typography variant="caption" color="text.disabled">
              Undeveloped
            </Typography>
          )}
          <LandDetailIcons listing={listing} size={20} />
        </Stack>

        <Typography variant="caption" color="text.secondary" noWrap>
          {listing.territory ? `${listing.territory} · ` : ""}Seller{" "}
          <Box component="span" sx={{ color: "text.primary", fontWeight: 600 }}>
            {listing.seller || "-"}
          </Box>{" "}
          · {formatListingAge(listing.listedAt, now)}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="p" fontWeight={800} lineHeight={1.1}>
              <LivePriceValue value={listing.priceUsd}>
                {formatLandPriceUsd(listing.priceUsd)}
              </LivePriceValue>
            </Typography>
            {decPriceUsd !== null && (
              <Typography variant="caption" color="text.secondary">
                ≈{" "}
                {(listing.priceUsd / decPriceUsd).toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                })}{" "}
                DEC
              </Typography>
            )}
          </Box>
          <LandCartButton state={cartState} location={listing.location} onToggle={onToggleCart} />
        </Stack>
      </Stack>
    </Box>
  );
}
