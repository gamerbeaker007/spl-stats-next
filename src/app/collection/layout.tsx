"use client";

import CollectionSubNav from "@/components/collection/CollectionSubNav";
import PurchaseCartDialog from "@/components/collection/top-bar/PurchaseCartDialog";
import TopBar from "@/components/collection/top-bar/TopBarBalancesCart";
import { MarketplaceViewProvider } from "@/lib/frontend/context/MarketplaceViewContext";
import { Box, Container } from "@mui/material";
import { usePathname } from "next/navigation";

// The DEC/Credits cart chrome only applies to the card-buying flows; the asset
// marketplaces (skins, music, packs, …) broadcast directly from their own dialogs.
const CART_CHROME_EXCLUDED_PREFIXES = [
  "/collection/skins",
  "/collection/music",
  "/collection/packs",
  "/collection/titles",
  "/collection/consumables",
  "/collection/collector-stickers",
  "/collection/totems",
  "/collection/land",
];

export default function CardsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  // Cart chrome (the shopping-cart button + checkout dialog) only applies to the
  // card-buying flows; skins/music still show the balances bar, just without the cart.
  const showCart = !CART_CHROME_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isOverview = pathname === "/collection";

  return (
    <MarketplaceViewProvider>
      <Box sx={{ position: "relative" }}>
        {!isOverview && <TopBar showCart={showCart} />}
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
