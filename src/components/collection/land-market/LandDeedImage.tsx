"use client";

import { land_deed_unsurveyed_url } from "@/lib/staticsIconUrls";
import { Box, type SxProps, type Theme } from "@mui/material";
import { useState } from "react";

interface LandDeedImageProps {
  src: string;
  alt: string;
  sx?: SxProps<Theme>;
}

/**
 * Deed artwork, lazy-loaded. Not every terrain/element/rarity combination has
 * artwork on the CDN, so a failed load falls back to the generic deed image.
 */
export default function LandDeedImage({ src, alt, sx }: Readonly<LandDeedImageProps>) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolved = failedSrc === src ? land_deed_unsurveyed_url : src;

  return (
    <Box
      component="img"
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (resolved !== land_deed_unsurveyed_url) setFailedSrc(src);
      }}
      sx={{ display: "block", objectFit: "cover", ...sx }}
    />
  );
}
