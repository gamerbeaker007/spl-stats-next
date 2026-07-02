import PurchaseCartDialog from "@/components/cards/PurchaseCartDialog";
import CardsTopBar from "@/components/cards/CardsTopBar";
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
