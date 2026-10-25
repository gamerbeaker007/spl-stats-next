"use client";

import CollectionSubNav from "@/components/collection/CollectionSubNav";
import PurchaseCartDialog from "@/components/collection/top-bar/PurchaseCartDialog";
import { MarketplaceViewProvider } from "@/lib/frontend/context/MarketplaceViewContext";
import { Box, Container } from "@mui/material";
import { usePathname } from "next/navigation";
import { isCollectionCartAvailable } from "@/lib/shared/collection-routes";

export default function CardsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const showCart = isCollectionCartAvailable(pathname);
  const isOverview = pathname === "/collection";

  return (
    <MarketplaceViewProvider>
      <Box sx={{ position: "relative" }}>
        {!isOverview && (
          <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
            <CollectionSubNav />
          </Container>
        )}
        {children}
        {showCart && <PurchaseCartDialog />}
      </Box>
    </MarketplaceViewProvider>
  );
}
