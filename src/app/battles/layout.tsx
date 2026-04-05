import { BattleFilterProvider } from "@/lib/frontend/context/BattleFilterContext";
import BattleNavigation from "@/components/battles/BattleNavigation";
import Box from "@mui/material/Box";

export default function BattlesLayout({ children }: { children: React.ReactNode }) {
  return (
    <BattleFilterProvider>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box sx={{ px: 2, pt: 2 }}>
          <BattleNavigation />
        </Box>
        {children}
      </Box>
    </BattleFilterProvider>
  );
}
