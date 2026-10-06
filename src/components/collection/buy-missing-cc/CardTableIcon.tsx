"use client";

import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { ARCANE_FOILS } from "@/lib/shared/card-utils";
import { ARCANE_GLIMMER_URL } from "@/lib/staticsIconUrls";
import type { CardFoil } from "@/types/card";
import { Box, Tooltip } from "@mui/material";
import Image from "next/image";

interface CardTableIconProps {
  name: string;
  edition: number;
  foil: CardFoil;
  level: number;
  ownedCc: number;
}

const CARD_FOIL_COLORS: Record<CardFoil, string> = {
  regular: "#9e9e9e",
  gold: "#ffc107",
  "gold arcane": "#ff8f00",
  black: "#424242",
  "black arcane": "#607d8b",
};

const CARD_WIDTH = 180;
const CARD_HEIGHT = 252;

export default function CardTableIcon({
  name,
  edition,
  foil,
  level,
  ownedCc,
}: Readonly<CardTableIconProps>) {
  const tileSrc = getCardImageByLevel(name, edition, foil, Math.max(1, level));

  const borderColor = CARD_FOIL_COLORS[foil] ?? "transparent";
  const isArcane = ARCANE_FOILS.has(foil);

  return (
    <Tooltip
      title={
        <Box
          sx={{
            position: "relative",
            width: CARD_WIDTH,
            lineHeight: 0,
          }}
        >
          {/* Card determines the height */}
          <Image
            src={tileSrc}
            alt={name}
            width={CARD_WIDTH}
            height={CARD_HEIGHT}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />

          {isArcane && (
            <Image
              src={ARCANE_GLIMMER_URL}
              alt=""
              aria-hidden
              fill
              unoptimized
              style={{
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          )}
        </Box>
      }
      placement="right"
    >
      <Box
        width={60}
        height={60}
        position="relative"
        sx={{
          borderRadius: 1,
          border: "3px solid",
          borderColor,
          opacity: ownedCc > 0 ? 1 : 0.4,
          filter: ownedCc > 0 ? "none" : "grayscale(60%)",
          overflow: "hidden",
          background: "#222",
        }}
      >
        <Image
          src={tileSrc}
          alt={name}
          width={135}
          height={135}
          style={{
            objectFit: "cover",
            objectPosition: "top center",
            marginTop: "-15px",
            marginLeft: "-45px",
            opacity: ownedCc > 0 ? 1 : 0.4,
            filter: ownedCc > 0 ? "none" : "grayscale(60%)",
          }}
        />
      </Box>
    </Tooltip>
  );
}
