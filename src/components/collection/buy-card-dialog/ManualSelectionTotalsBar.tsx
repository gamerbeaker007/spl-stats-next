import CurrencyAmountChip from "@/components/collection/top-bar/CurrencyAmountChip";
import { Box, Typography } from "@mui/material";

interface ManualSelectionTotalsBarProps {
  selectionTotals: {
    count: number;
    cc: number;
    usd: number;
    dec: number;
    credits: number;
  };
}

export default function ManualSelectionTotalsBar({
  selectionTotals,
}: Readonly<ManualSelectionTotalsBarProps>) {
  return (
    <Box
      sx={{
        position: "sticky",
        bottom: -16,
        borderTop: 1,
        borderColor: "divider",
        backgroundColor: "background.paper",
        py: 1,
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
        zIndex: 1,
      }}
    >
      <Typography variant="body2" sx={{ alignSelf: "center", mr: 1 }}>
        Selected: {selectionTotals.count} listings / {selectionTotals.cc} CC
      </Typography>
      <CurrencyAmountChip currency="USD" value={selectionTotals.usd} />
      <CurrencyAmountChip currency="DEC" value={selectionTotals.dec} />
      <CurrencyAmountChip currency="CREDITS" value={selectionTotals.credits} />
    </Box>
  );
}
