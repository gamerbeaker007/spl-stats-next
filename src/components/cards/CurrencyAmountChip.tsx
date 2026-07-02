"use client";

import { credits_icon_url, dec_icon_url, sps_icon_url } from "@/lib/staticsIconUrls";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";

type CurrencySymbol = "CREDITS" | "DEC" | "SPS" | "USD";

const ICONS: Partial<Record<CurrencySymbol, string>> = {
  CREDITS: credits_icon_url,
  DEC: dec_icon_url,
  SPS: sps_icon_url,
};

function formatAmount(currency: CurrencySymbol, value: number): string {
  if (currency === "CREDITS") return value.toFixed(0);
  if (currency === "USD") return `$${value.toFixed(3)}`;
  return value.toFixed(3);
}

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
      label={`${currency === "USD" ? "USD" : currency} ${formatAmount(currency, value)}`}
    />
  );
}
