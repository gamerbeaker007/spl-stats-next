import { BattleFilterProvider } from "@/lib/frontend/context/BattleFilterContext";
import BattleNavigation from "@/components/battles/BattleNavigation";
import Box from "@mui/material/Box";
import { Suspense } from "react";

export default function BattlesLayout({ children }: { children: React.ReactNode }) {
  return (
    <BattleFilterProvider>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ px: 2, pt: 2 }}>
          <Suspense>
            <BattleNavigation />
          </Suspense>
        </Box>
        {children}
      </Box>
    </BattleFilterProvider>
  );
}
