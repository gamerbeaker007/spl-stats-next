import PurchaseCartDialog from "@/components/cards/top-bar/PurchaseCartDialog";
import CardsTopBar from "@/components/cards/top-bar/CardsTopBar";
import Box from "@mui/material/Box";

export default function CardsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Box sx={{ position: "relative" }}>
      <CardsTopBar />
      {children}
      <PurchaseCartDialog />
    </Box>
  );
}
