import CardStatsNavigation from "@/components/card-stats/CardStatsNavigation";
import { CardStatsFilterProvider } from "@/lib/frontend/context/CardStatsFilterContext";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import { Suspense } from "react";

export default function CardStatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <CardStatsFilterProvider>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Suspense>
          <CardStatsNavigation />
        </Suspense>
        <Suspense fallback={<LinearProgress />}>{children}</Suspense>
      </Box>
    </CardStatsFilterProvider>
  );
}
