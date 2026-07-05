"use client";

import { credits_icon_url, dec_icon_url, sps_icon_url } from "@/lib/staticsIconUrls";
import { largeNumberFormat } from "@/lib/utils";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";

type CurrencySymbol = "CREDITS" | "DEC" | "SPS" | "USD";

const ICONS: Partial<Record<CurrencySymbol, string>> = {
  CREDITS: credits_icon_url,
  DEC: dec_icon_url,
  SPS: sps_icon_url,
};

export default function CurrencyAmountChip({
  currency,
  value,
  size = "small",
}: Readonly<{
  currency: CurrencySymbol;
  value: number;
  size?: "small" | "medium";
}>) {
  const icon = ICONS[currency];
  return (
    <Chip
      variant="outlined"
      size={size}
      avatar={icon ? <Avatar src={icon} alt={currency} /> : undefined}
      label={`${currency === "USD" ? "USD" : currency} ${largeNumberFormat(value)}`}
    />
  );
}
