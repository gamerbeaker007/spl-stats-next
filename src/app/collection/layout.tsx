"use client";

import PurchaseCartDialog from "@/components/collection/top-bar/PurchaseCartDialog";
import TopBar from "@/components/collection/top-bar/TopBarBalancesCart";
import Box from "@mui/material/Box";
import { usePathname } from "next/navigation";

export default function CardsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const showPurchaseChrome = !pathname.startsWith("/collection/skins");

  return (
    <Box sx={{ position: "relative" }}>
      {showPurchaseChrome && <TopBar />}
      {children}
      {showPurchaseChrome && <PurchaseCartDialog />}
    </Box>
  );
}
