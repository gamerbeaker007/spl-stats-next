"use client";

import CollectionSubNav from "@/components/collection/CollectionSubNav";
import PurchaseCartDialog from "@/components/collection/top-bar/PurchaseCartDialog";
import TopBar from "@/components/collection/top-bar/TopBarBalancesCart";
import { Box, Container } from "@mui/material";
import { usePathname } from "next/navigation";

// The DEC/Credits cart chrome only applies to the card-buying flows; the skin and
// music marketplaces broadcast directly from their own dialogs.
const CART_CHROME_EXCLUDED_PREFIXES = ["/collection/skins", "/collection/music"];

export default function CardsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  // Cart chrome (the shopping-cart button + checkout dialog) only applies to the
  // card-buying flows; skins/music still show the balances bar, just without the cart.
  const showCart = !CART_CHROME_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isOverview = pathname === "/collection";

  return (
    <Box sx={{ position: "relative" }}>
      {!isOverview && <TopBar showCart={showCart} />}
      {!isOverview && (
        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, pt: 2 }}>
          <CollectionSubNav />
        </Container>
      )}
      {children}
      {showCart && <PurchaseCartDialog />}
    </Box>
  );
}
