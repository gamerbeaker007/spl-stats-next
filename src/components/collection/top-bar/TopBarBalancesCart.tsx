"use client";

import PurchaseCartButton from "@/components/collection/top-bar/PurchaseCartButton";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import TopBarBalances from "@/components/top-bar/TopBarBalances";
import Box from "@mui/material/Box";
import { Suspense } from "react";

interface TopBarBalancesCartProps {
  showCart?: boolean;
}

export default function TopBarBalancesCart({ showCart = true }: Readonly<TopBarBalancesCartProps>) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 1,
        px: 2,
        py: 1,
        mb: 0.5,
        position: { xs: "relative", md: "sticky" },
        top: { xs: "auto", md: APP_BAR_HEIGHT },
        zIndex: (theme) => theme.zIndex.appBar,
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
        {showCart && <PurchaseCartButton />}
      </Box>
    </Box>
  );
}
