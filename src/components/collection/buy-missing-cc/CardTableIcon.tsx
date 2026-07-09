"use client";

import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
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

export default function CardTableIcon({
  name,
  edition,
  foil,
  level,
  ownedCc,
}: Readonly<CardTableIconProps>) {
  const tileSrc = getCardImageByLevel(name, edition, foil, Math.max(1, level));

  return (
    <Tooltip
      title={
        <Image src={tileSrc} alt={name} width={180} height={252} style={{ objectFit: "contain" }} />
      }
      placement="right"
    >
      <Box
        width={60}
        height={60}
        position="relative"
        sx={{
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
      {/*  Old implementation keep for reference */}
      {/* <Box>
        <Image
          src={tileSrc}
          alt={name}
          width={46}
          height={46}
          style={{
            objectFit: "cover",
            borderRadius: 6,
            opacity: ownedCc > 0 ? 1 : 0.4,
            filter: ownedCc > 0 ? "none" : "grayscale(60%)",
          }}
        />
      </Box>
 */}
    </Tooltip>
  );
}
