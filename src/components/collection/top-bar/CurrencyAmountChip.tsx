"use client";

import { credits_icon_url, dec_icon_url, sps_icon_url } from "@/lib/staticsIconUrls";
import { largeNumberFormat } from "@/lib/utils";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { Skeleton } from "@mui/material";

type CurrencySymbol = "CREDITS" | "DEC" | "SPS" | "USD";

const ICONS: Partial<Record<CurrencySymbol, string>> = {
  CREDITS: credits_icon_url,
  DEC: dec_icon_url,
  SPS: sps_icon_url,
};

interface CurrencyAmountChipProps {
  currency: CurrencySymbol;
  value: number;
  compareValue?: number;
  loading?: boolean;
  size?: "small" | "medium";
}

export default function CurrencyAmountChip({
  currency,
  value,
  compareValue,
  loading = false,
  size = "small",
}: Readonly<CurrencyAmountChipProps>) {
  const icon = ICONS[currency];
  const hasEnough = compareValue === undefined || compareValue >= value;

  const format = (amount: number) => `${currency === "USD" ? "$" : ""}${largeNumberFormat(amount)}`;

  return (
    <Chip
      variant="outlined"
      size={size}
      avatar={icon ? <Avatar src={icon} alt={currency} /> : undefined}
      label={
        loading ? (
          <Skeleton variant="text" width={40} height={16} />
        ) : compareValue === undefined ? (
          format(value)
        ) : (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography
              component="span"
              variant="caption"
              fontWeight={600}
              color={hasEnough ? "success.main" : "error.main"}
            >
              {format(value)}
            </Typography>
            <Typography component="span" variant="caption" color="text.secondary">
              /
            </Typography>
            <Typography component="span" variant="caption">
              {format(compareValue)}
            </Typography>
          </Box>
        )
      }
      sx={{ gap: 0.5 }}
    />
  );
}
