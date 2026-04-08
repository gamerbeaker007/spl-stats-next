import BattleNavigation from "@/components/battles/BattleNavigation";
import PageGuard from "@/components/shared/PageGuard";
import { BattleFilterProvider } from "@/lib/frontend/context/BattleFilterContext";
import Box from "@mui/material/Box";
import { Suspense } from "react";

export default function BattlesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PageGuard>
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
      </PageGuard>
    </Suspense>
  );
}
