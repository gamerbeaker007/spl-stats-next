"use client";
import { LiveCount, LivePrice } from "@/components/collection/cards/LivePrice";
import { WatchButton } from "@/components/collection/cards/WatchButton";
import { formatPct, pctChange, pctColor } from "@/lib/shared/card-watch-utils";
import { CardDetail, CardFoil } from "@/types/card";
import type { CardWatch } from "@/types/card-watch";
import type { MarketPriceInfo } from "@/types/spl/market";
import { Box, IconButton, Skeleton, Tooltip, Typography } from "@mui/material";
import Image from "next/image";
import { Fragment, useState } from "react";
import { MdHistory, MdStorefront } from "react-icons/md";
import { ARCANE_GLIMMER_URL } from "@/lib/staticsIconUrls";
import { ARCANE_FOILS } from "@/lib/shared/card-utils";

interface Props {
  player: string;
  name: string;
  imageUrl: string;
  subTitle: string;
  allCards?: CardDetail[];
  foil?: CardFoil;
  opacity?: number;
  priority?: boolean;
  onClick?: () => void;
  /** Current market prices; also used for the watch comparison. */
  priceInfo?: MarketPriceInfo;
  showPrices?: boolean;
  watch?: CardWatch;
  /** Omit to hide the watch button (guests). */
  onToggleWatch?: () => void;
  /** Omit to hide the history button (e.g. missing cards). */
  onShowHistory?: () => void;
}

// Display width — change this to resize cards. Height follows the source image ratio.
const CARD_DISPLAY_WIDTH = 150;
// Intrinsic size of the SPL card images (572×800); only the ratio matters.
const CARD_IMAGE_WIDTH = 572;
const CARD_IMAGE_HEIGHT = 800;

const rowSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minHeight: 24,
  px: 0.5,
  fontSize: "0.8rem",
} as const;

export const Card = ({
  player,
  name,
  imageUrl,
  subTitle,
  allCards,
  foil,
  opacity = 1,
  priority = false,
  onClick,
  priceInfo,
  showPrices = false,
  watch,
  onToggleWatch,
  onShowHistory,
}: Props) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.warn(`Failed to load image: ${imageUrl}`);
    setImageError(true);
    setImageLoaded(true); // Hide skeleton even on error
  };

  // Group cards by player and level
  const groupCards = (cards: CardDetail[]) => {
    const grouped = new Map<
      string,
      { player: string; level: number; bcx: number; count: number }
    >();

    cards.forEach((card) => {
      const key = `${card.owner}-${card.level}`;
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.count += 1;
        existing.bcx = card.bcx;
      } else {
        grouped.set(key, {
          player: card.owner,
          level: card.level,
          bcx: card.bcx,
          count: 1,
        });
      }
    });

    // Sort by level descending (highest first)
    return Array.from(grouped.values()).sort((a, b) => b.level - a.level);
  };

  const owned = allCards ? groupCards(allCards.filter((p) => p.owner === player)) : [];
  const delegatedCards = allCards ? groupCards(allCards.filter((p) => p.owner !== player)) : [];
  const watchChanges = watch
    ? [
        pctChange(watch.lowPriceAtWatch, priceInfo?.lowPrice),
        pctChange(watch.lowPriceBcxAtWatch, priceInfo?.lowPriceBcx),
      ]
    : [];

  const ownershipTooltip =
    allCards && allCards.length > 0 ? (
      <Box>
        {owned.length > 0 && (
          <>
            <Typography variant="body2" fontWeight="bold" mb={0.5}>
              Owned:
            </Typography>
            {owned.map((card, index) => (
              <Typography key={index} variant="body2">
                • Level {card.level} - CC {card.bcx} {card.count > 1 ? `(x${card.count})` : ""}
              </Typography>
            ))}
          </>
        )}
        {delegatedCards.length > 0 && (
          <>
            <Typography variant="body2" fontWeight="bold" mb={0.5}>
              Delegated by:
            </Typography>
            {delegatedCards.map((card, index) => (
              <Typography key={index} variant="body2">
                • {card.player} - Level {card.level} - CC {card.bcx}{" "}
                {card.count > 1 ? `(x${card.count})` : ""}
              </Typography>
            ))}
          </>
        )}
      </Box>
    ) : (
      ""
    );

  return (
    <Box
      onClick={onClick}
      sx={{
        width: CARD_DISPLAY_WIDTH,
        display: "flex",
        flexDirection: "column",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        backgroundColor: "background.paper",
        opacity,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 120ms ease, border-color 120ms ease",
        "&:hover": onClick
          ? { transform: "translateY(-2px)", borderColor: "primary.main" }
          : undefined,
      }}
    >
      {(showPrices || onToggleWatch || onShowHistory) && (
        <Box sx={rowSx}>
          {showPrices && priceInfo ? (
            <Tooltip title={`${priceInfo.qty} listed on the market`} arrow>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <MdStorefront size={14} />
                <Box>
                  <LiveCount value={priceInfo.qty} />
                </Box>
              </Box>
            </Tooltip>
          ) : (
            <span />
          )}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {onShowHistory && (
              <Tooltip title="Card history" arrow>
                <IconButton
                  size="small"
                  aria-label="Card history"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowHistory();
                  }}
                  sx={{ color: "text.secondary" }}
                >
                  <MdHistory size={16} />
                </IconButton>
              </Tooltip>
            )}
            {onToggleWatch && (
              <WatchButton watch={watch} priceInfo={priceInfo} onToggle={onToggleWatch} />
            )}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          width: CARD_DISPLAY_WIDTH,
          aspectRatio: `${CARD_IMAGE_WIDTH} / ${CARD_IMAGE_HEIGHT}`,
          position: "relative",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Image
          src={imageUrl}
          alt={name}
          width={CARD_IMAGE_WIDTH}
          height={CARD_IMAGE_HEIGHT}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          sizes={`${CARD_DISPLAY_WIDTH}px`}
          onLoad={() => setImageLoaded(true)}
          onError={handleImageError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {foil && ARCANE_FOILS.has(foil) && imageLoaded && !imageError && (
          // Animated webp — unoptimized so Next.js serves it as-is.
          <Image
            src={ARCANE_GLIMMER_URL}
            alt=""
            aria-hidden
            width={CARD_IMAGE_WIDTH}
            height={CARD_IMAGE_HEIGHT}
            unoptimized
            style={{
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
              boxSizing: "border-box",
              position: "absolute",
            }}
          />
        )}
        {!imageLoaded && !imageError && (
          <Skeleton
            variant="rectangular"
            animation="wave"
            sx={{ position: "absolute", inset: 0, height: "100%", zIndex: 1 }}
          />
        )}
        {imageError && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "error.dark",
              color: "error.contrastText",
              fontSize: "0.75rem",
              textAlign: "center",
              padding: 1,
            }}
          >
            <Typography variant="body2">{name}</Typography>
            <Typography variant="body2">Image not found</Typography>
          </Box>
        )}
      </Box>

      {showPrices && priceInfo && (
        <Box sx={rowSx}>
          <Tooltip title="Lowest 1 CC price" arrow>
            <Box>
              <LivePrice value={priceInfo.lowPrice} />
            </Box>
          </Tooltip>
          <Tooltip title="Lowest price per CC" arrow>
            <Box>
              <LivePrice value={priceInfo.lowPriceBcx} />
            </Box>
          </Tooltip>
        </Box>
      )}

      {/* mt auto: keeps the details row at the bottom when cards in a row stretch to equal height. */}
      <Box sx={{ mt: "auto", pt: 0.25, borderTop: 1, borderColor: "divider", textAlign: "center" }}>
        <Tooltip title={ownershipTooltip} arrow>
          <Typography variant="body2">{subTitle}</Typography>
        </Tooltip>
        {showPrices && watchChanges.some((pct) => pct !== null) && (
          <Typography variant="caption" display="block">
            {watchChanges.map((pct, i) => (
              <Fragment key={i}>
                {i > 0 && " / "}
                <Box
                  component="span"
                  sx={{ color: pct === null ? "text.secondary" : pctColor(pct) }}
                >
                  {pct === null ? "-" : formatPct(pct)}
                </Box>
              </Fragment>
            ))}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
