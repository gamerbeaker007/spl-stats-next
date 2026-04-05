import type { CombinedPortfolioSnapshot } from "@/lib/backend/actions/portfolio-actions";
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
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

interface Props {
  snapshot: CombinedPortfolioSnapshot;
  totalInvested: number;
}

interface SummaryCardProps {
  title: string;
  lines: { label: string; value: string }[];
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
        <Box key={l.label} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Typography variant="body2" color="text.secondary" noWrap>
            {l.label}
          </Typography>
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

export default function PortfolioSummaryCards({ snapshot, totalInvested }: Props) {
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

  const otherValue =
    snapshot.voucherValue +
    snapshot.creditsValue +
    snapshot.decBValue +
    snapshot.voucherGValue +
    snapshot.licenseValue +
    snapshot.liqPoolDecValue +
    snapshot.liqPoolSpsValue +
    snapshot.inventoryValue;

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
        { label: "Inventory", value: usd(snapshot.inventoryValue) },
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
        },
      ],
      color: "text.secondary",
    },
  ];

  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid key={card.title} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <SummaryCard {...card} />
        </Grid>
      ))}
    </Grid>
  );
}
