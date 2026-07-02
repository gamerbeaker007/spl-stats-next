"use client";

import PurchaseCartButton from "@/components/cards/PurchaseCartButton";
import TopBarBalances from "@/components/top-bar/TopBarBalances";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function CardsTopBar() {
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
        position: "sticky",
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        boxShadow: 1,
        backgroundColor: "background.paper",
      }}
    >
      <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1 }}>
        Card Shopping
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <TopBarBalances />
        <PurchaseCartButton />
      </Box>
    </Box>
  );
}
