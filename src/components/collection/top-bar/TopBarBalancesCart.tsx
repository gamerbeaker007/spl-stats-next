"use client";

import PurchaseCartButton from "@/components/collection/top-bar/PurchaseCartButton";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import TopBarBalances from "@/components/top-bar/TopBarBalances";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Box from "@mui/material/Box";
import { Suspense } from "react";

export default function TopBarBalancesCart() {
  const isMobile = useMediaQuery("(max-width:899px)");

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 1,
        px: 2,
        py: 1,
        mb: 2.5,
        position: isMobile ? "relative" : "sticky",
        top: isMobile ? "auto" : APP_BAR_HEIGHT,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        boxShadow: 1,
        backgroundColor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Suspense fallback={<Box sx={{ width: 120, height: 24 }} />}>
          <TopBarBalances />
        </Suspense>
        <PurchaseCartButton />
      </Box>
    </Box>
  );
}
