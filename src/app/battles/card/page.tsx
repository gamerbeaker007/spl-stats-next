"use client";

import CardDetailContent from "@/components/battles/CardDetailContent";
import BattleFilterDrawer from "@/components/battles/BattleFilterDrawer";
import { useBattleFilter } from "@/lib/frontend/context/BattleFilterContext";
import Box from "@mui/material/Box";

export default function CardDetailTabPage() {
  const { filter } = useBattleFilter();

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <CardDetailContent
          cardDetailId={filter.selectedCardDetailId}
          initialAccount={filter.account}
          tabMode
        />
      </Box>
      <BattleFilterDrawer />
    </Box>
  );
}
