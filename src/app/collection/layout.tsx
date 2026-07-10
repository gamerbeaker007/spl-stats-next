import TopBar from "@/components/collection/top-bar/TopBarBalancesCart";
import PurchaseCartDialog from "@/components/collection/top-bar/PurchaseCartDialog";
import Box from "@mui/material/Box";

export default function CardsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Box sx={{ position: "relative" }}>
      <TopBar />
      {children}
      <PurchaseCartDialog />
    </Box>
  );
}
