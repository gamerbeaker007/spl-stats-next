"use client";

import { useLandNetDec } from "@/hooks/multi-account-dashboard/useLandNetDec";
import { getLandTokenIconUrl } from "@/lib/shared/land-deed-utils";
import { LAND_PRODUCTION_TAX_RATE, MIDNIGHT_POTION_AURA } from "@/lib/shared/land-net-dec";
import { dec_icon_url } from "@/lib/staticsIconUrls";
import type { LandNetDecSummary } from "@/types/land/landNetDec";
import InfoIcon from "@mui/icons-material/Info";
import { Box, Chip, CircularProgress, Tooltip, Typography } from "@mui/material";
import { MdOutlineFactory } from "react-icons/md";
import Divider from "@mui/material/Divider";

function fmt(value: number, digits = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function signed(value: number, digits = 2): string {
  return `${value >= 0 ? "+" : ""}${fmt(value, digits)}`;
}

function TokenIcon({ token, iconUrl }: { token: string; iconUrl?: string | null }) {
  const src = iconUrl ?? getLandTokenIconUrl(token);
  if (!src) return <>{token}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={token} title={token} width={18} height={18} style={{ display: "block" }} />
  );
}

function Breakdown({ data }: { data: LandNetDecSummary }) {
  return (
    <Box sx={{ p: 0.5 }}>
      <Box
        component="table"
        sx={{ borderCollapse: "collapse", "& td, & th": { px: 0.75, textAlign: "right" } }}
      >
        <thead>
          <tr>
            <Box component="th" sx={{ textAlign: "left !important" }}>
              /h
            </Box>
            <th>Produced</th>
            <th>Consumed</th>
            <th>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <TokenIcon token="DEC" iconUrl={dec_icon_url} />
              </Box>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.resource}>
              <Box component="td" sx={{ textAlign: "left !important", py: 0.25 }}>
                <TokenIcon token={row.resource} />
              </Box>
              <td>{fmt(row.producedPerHour)}</td>
              <td>{fmt(row.consumedPerHour)}</td>
              <td>{row.priceDec === null ? "n/a" : signed(row.netDecPerHour, 3)}</td>
            </tr>
          ))}
        </tbody>
      </Box>
      <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
        {data.worksiteCount} worksites · {signed(data.netDecPerHour * 24)} DEC/day
      </Typography>
      <Divider sx={{ mt: 0.5 }} />
      <Typography variant="caption" component="div">
        Production after {LAND_PRODUCTION_TAX_RATE * 100}% tax.
      </Typography>
      <Typography variant="caption" component="div">
        No trade hub fees are applied.
      </Typography>
      <Typography variant="caption" component="div">
        Keeps/Castles excluded.
      </Typography>
      <Divider />

      {data.aura && (
        <Typography variant="caption" component="div">
          AURA valued via Midnight Potion: 1 potion = {MIDNIGHT_POTION_AURA} AURA ($
          {fmt(data.aura.midnightPotionUsd, 3)}) → {fmt(data.aura.auraPriceDec, 4)} DEC/AURA.
        </Typography>
      )}
      {data.unpricedResources.length > 0 && (
        <Typography variant="caption" component="div">
          No price (counted as 0): {data.unpricedResources.join(", ")}
        </Typography>
      )}
    </Box>
  );
}

export function LandNetDec({ username }: { username: string }) {
  const { data, loading, error } = useLandNetDec(username);

  const title = (
    <>
      <MdOutlineFactory size={18} style={{ opacity: 0.6 }} />
      <Typography variant="body2" color="text.secondary">
        Land net DEC
      </Typography>
    </>
  );

  if (loading && !data) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {title}
        <CircularProgress size={14} />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {title}
        <Tooltip title={error}>
          <Chip label="Error" color="error" size="small" variant="outlined" />
        </Tooltip>
      </Box>
    );
  }

  // No land (or only Keeps/Castles) — nothing to show.
  if (!data || data.worksiteCount === 0) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
      {title}
      <Chip
        label={`${signed(data.netDecPerHour)} DEC/h`}
        color={data.netDecPerHour >= 0 ? "success" : "error"}
        size="small"
        sx={{ fontWeight: "bold" }}
      />
      <Tooltip title={<Breakdown data={data} />}>
        <InfoIcon fontSize="small" sx={{ cursor: "help", color: "action.active" }} />
      </Tooltip>
      {loading && <CircularProgress size={12} />}
    </Box>
  );
}
