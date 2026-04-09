"use client";

import type { CombinedPortfolioSnapshot } from "@/lib/backend/actions/portfolio-actions";
import PortfolioDetailDialog, {
  type DetailRow,
} from "@/components/portfolio/PortfolioDetailDialog";
import {
  cards_icon_url,
  coins_icon_url,
  dec_icon_url,
  land_icon_url,
  other_icon_url,
  sps_icon_url,
} from "@/lib/staticsIconUrls";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { MdInfoOutline } from "react-icons/md";

interface Props {
  snapshot: CombinedPortfolioSnapshot;
  totalInvested: number;
}

interface SummaryLine {
  label: string;
  value: string;
  onInfo?: () => void;
}

interface SummaryCardProps {
  title: string;
  lines: SummaryLine[];
  color?: string;
  imageUrl?: string;
}

function SummaryCard({ title, lines, color, imageUrl }: SummaryCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: "100%",
        borderTop: 3,
        borderColor: color ?? "primary.main",
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {imageUrl && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${imageUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "contain",
            opacity: 0.1,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}
      <Typography variant="subtitle2" color="text.secondary" noWrap>
        {title}
      </Typography>
      {lines.map((l) => (
        <Box
          key={l.label}
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary" noWrap>
              {l.label}
            </Typography>
            {l.onInfo && (
              <Tooltip title={`View ${l.label} details`}>
                <IconButton size="small" onClick={l.onInfo} sx={{ p: 0.25 }}>
                  <MdInfoOutline size={14} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography variant="body2" fontWeight="bold" noWrap>
            {l.value}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

function usd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface DialogState {
  title: string;
  rows: DetailRow[];
}

export default function PortfolioSummaryCards({ snapshot, totalInvested }: Props) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const openDialog = (title: string, rows: DetailRow[]) => setDialog({ title, rows });
  const closeDialog = () => setDialog(null);

  const tokenRows: DetailRow[] = [
    { name: "VOUCHER", qty: snapshot.voucherQty, value: snapshot.voucherValue },
    { name: "CREDITS", qty: snapshot.creditsQty, value: snapshot.creditsValue },
    { name: "DEC-B", qty: snapshot.decBQty, value: snapshot.decBValue },
    { name: "VOUCHER-G", qty: snapshot.voucherGQty, value: snapshot.voucherGValue },
    { name: "LICENSE", qty: snapshot.licenseQty, value: snapshot.licenseValue },
  ].filter((r) => r.value > 0 || r.qty > 0);

  const inventoryRows: DetailRow[] = snapshot.inventoryDetails.map((d) => ({
    name: d.name,
    qty: d.qty,
    value: d.value,
  }));
  const totalValue =
    snapshot.collectionMarketValue +
    snapshot.decValue +
    snapshot.decStakedValue +
    snapshot.spsValue +
    snapshot.spspValue +
    snapshot.deedsValue +
    snapshot.landResourceValue +
    snapshot.liqPoolDecValue +
    snapshot.liqPoolSpsValue +
    snapshot.inventoryValue +
    snapshot.voucherValue +
    snapshot.creditsValue +
    snapshot.decBValue +
    snapshot.voucherGValue +
    snapshot.licenseValue;

  const landValue = snapshot.deedsValue + snapshot.landResourceValue;

  const cards: SummaryCardProps[] = [
    {
      title: "Total",
      imageUrl: coins_icon_url,
      lines: [
        { label: "Value", value: usd(totalValue) },
        { label: "Invested", value: usd(totalInvested) },
        ...(totalInvested > 0 ? [{ label: "P&L", value: usd(totalValue - totalInvested) }] : []),
      ],
      color: "primary.main",
    },
    {
      title: "Cards",
      imageUrl: cards_icon_url,
      lines: [
        { label: "Market", value: usd(snapshot.collectionMarketValue) },
        { label: "List", value: usd(snapshot.collectionListValue) },
      ],
      color: "secondary.main",
    },
    {
      title: "DEC",
      imageUrl: dec_icon_url,
      lines: [
        { label: "Liquid", value: usd(snapshot.decValue) },
        { label: "Staked", value: usd(snapshot.decStakedValue) },
      ],
      color: "warning.main",
    },
    {
      title: "SPS",
      imageUrl: sps_icon_url,
      lines: [
        { label: "Liquid", value: usd(snapshot.spsValue) },
        { label: "Staked", value: usd(snapshot.spspValue) },
      ],
      color: "info.main",
    },
    {
      title: "Land",
      imageUrl: land_icon_url,
      lines: [
        { label: "Deeds", value: usd(snapshot.deedsValue) },
        { label: "Resources", value: usd(snapshot.landResourceValue) },
        { label: "Total", value: usd(landValue) },
      ],
      color: "success.main",
    },
    {
      title: "Others",
      imageUrl: other_icon_url,
      lines: [
        {
          label: "Inventory",
          value: usd(snapshot.inventoryValue),
          onInfo:
            inventoryRows.length > 0 ? () => openDialog("Inventory", inventoryRows) : undefined,
        },
        { label: "Liq. Pool", value: usd(snapshot.liqPoolDecValue + snapshot.liqPoolSpsValue) },
        {
          label: "Tokens",
          value: usd(
            snapshot.voucherValue +
              snapshot.creditsValue +
              snapshot.decBValue +
              snapshot.voucherGValue +
              snapshot.licenseValue
          ),
          onInfo: tokenRows.length > 0 ? () => openDialog("Tokens", tokenRows) : undefined,
        },
      ],
      color: "text.secondary",
    },
  ];

  return (
    <>
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <SummaryCard {...card} />
          </Grid>
        ))}
      </Grid>
      {dialog && (
        <PortfolioDetailDialog open onClose={closeDialog} title={dialog.title} rows={dialog.rows} />
      )}
    </>
  );
}
