import { credits_icon_url, dec_icon_url, sps_icon_url } from "@/lib/staticsIconUrls";
import { largeNumberFormat } from "@/lib/utils";
import { PlayerPoolBalances, SplBalance } from "@/types/spl/balances";
import { Avatar, Box, Card, Divider, Tooltip, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface Props {
  balances?: SplBalance[];
  poolBalances?: PlayerPoolBalances;
  poolBalancesError?: string;
  stakedDec?: number;
  stakedDecError?: string;
  tradeHubDecBalance?: number;
  tradeHubDecBalanceError?: string;
  loading?: boolean;
}

const iconSize = 20;

const MyCard = ({ iconUrl, title, value }: { iconUrl: string; title: string; value: string }) => (
  <Card variant="outlined" sx={{ flex: 1 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Avatar
        src={iconUrl}
        sx={{
          width: iconSize,
          height: iconSize,
          marginLeft: 0.5,
        }}
      >
        {title.slice(0, 2)}
      </Avatar>

      <Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {value}
        </Typography>
      </Box>
    </Box>
  </Card>
);

// Reusable row with aligned labels and values
const TooltipRow = ({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string | number;
  bold?: boolean;
}) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      alignItems: "baseline",
      columnGap: 3,
      py: 0.25,
    }}
  >
    <Typography
      variant="body2"
      sx={{
        color: bold ? "text.primary" : "text.secondary",
        fontWeight: bold ? 600 : 400,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Typography>

    <Typography
      variant="body2"
      sx={{
        textAlign: "right",
        fontWeight: bold ? 700 : 500,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </Typography>
  </Box>
);

// Shared tooltip styling for DEC and SPS
const BalanceTooltip = ({ children, content }: { children: ReactNode; content: ReactNode }) => (
  <Tooltip
    title={<Box sx={{ minWidth: 230, py: 0.5 }}>{content}</Box>}
    arrow
    placement="top"
    slotProps={{
      tooltip: {
        sx: {
          maxWidth: "none",
          bgcolor: "background.paper",
          color: "text.primary",
          boxShadow: 3,
          border: 1,
          borderColor: "divider",
          p: 1.5,
        },
      },
      arrow: {
        sx: {
          color: "background.paper",
        },
      },
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
  </Tooltip>
);

export default function TopBalances({
  balances,
  poolBalances,
  poolBalancesError,
  stakedDec,
  stakedDecError,
  tradeHubDecBalance,
  tradeHubDecBalanceError,
  loading = false,
}: Props) {
  // Extract balance values
  const credits = balances?.find((b) => b.token === "CREDITS")?.balance ?? 0;
  const dec = balances?.find((b) => b.token === "DEC")?.balance ?? 0;
  const decBound = balances?.find((b) => b.token === "DEC-B")?.balance ?? 0;
  const sps = balances?.find((b) => b.token === "SPS")?.balance ?? 0;
  const spsp = balances?.find((b) => b.token === "SPSP")?.balance ?? 0;
  const spspIn = balances?.find((b) => b.token === "SPSP-IN")?.balance ?? 0;
  const spspOut = balances?.find((b) => b.token === "SPSP-OUT")?.balance ?? 0;

  // SPS used for rewards
  const rankedSPS = spsp + spspIn - spspOut;

  // Liquidity pool balances
  const poolDecInGame = poolBalances?.inGameDecQty ?? 0;
  const poolDecHE = poolBalances?.heDecQty ?? 0;
  const poolSpsInGame = poolBalances?.inGameSpsQty ?? 0;
  const poolSpsHE = poolBalances?.heSpsQty ?? 0;

  const poolDec = poolBalances?.decQty ?? 0;
  const poolSps = poolBalances?.spsQty ?? 0;

  const stakedDecValue = stakedDec ?? 0;
  const tradeHubDecValue = tradeHubDecBalance ?? 0;

  // Calculate totals
  const totalDec = dec + decBound + poolDec + stakedDecValue + tradeHubDecValue;

  const totalSps = sps + spsp + poolSps;

  // Handle optional balance states
  const getBalanceValue = (value: number | undefined, error?: string): string => {
    if (error && value == null) return "Unavailable";
    if (value != null) return largeNumberFormat(value);
    return loading ? "Loading..." : "—";
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        width: "100%",
      }}
    >
      <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
        {/* Credits */}
        <MyCard iconUrl={credits_icon_url} title="Credits" value={largeNumberFormat(credits)} />

        {/* DEC */}
        <BalanceTooltip
          content={
            <>
              <TooltipRow label="Liquid" value={largeNumberFormat(dec)} />
              <TooltipRow label="DEC-B" value={largeNumberFormat(decBound)} />
              <TooltipRow
                label="Staked on Land"
                value={getBalanceValue(stakedDec, stakedDecError)}
              />
              <TooltipRow
                label="TradeHub"
                value={getBalanceValue(tradeHubDecBalance, tradeHubDecBalanceError)}
              />

              {poolBalances ? (
                <>
                  <TooltipRow label="Pool (in-game)" value={largeNumberFormat(poolDecInGame)} />
                  <TooltipRow label="Pool (HE)" value={largeNumberFormat(poolDecHE)} />
                </>
              ) : (
                <TooltipRow
                  label="DEC Pool"
                  value={poolBalancesError ? "Unavailable" : loading ? "Loading..." : "—"}
                />
              )}

              <Divider sx={{ my: 1 }} />

              <TooltipRow label="Total DEC" value={largeNumberFormat(totalDec)} bold />
            </>
          }
        >
          <MyCard iconUrl={dec_icon_url} title="DEC" value={largeNumberFormat(totalDec)} />
        </BalanceTooltip>

        {/* SPS */}
        <BalanceTooltip
          content={
            <>
              <TooltipRow label="Liquid" value={largeNumberFormat(sps)} />
              <TooltipRow label="Staked" value={largeNumberFormat(spsp)} />
              <TooltipRow label="Delegated In" value={largeNumberFormat(spspIn)} />
              <TooltipRow label="Delegated Out" value={largeNumberFormat(spspOut)} />

              {poolBalances ? (
                <>
                  <TooltipRow label="Pool (in-game)" value={largeNumberFormat(poolSpsInGame)} />
                  <TooltipRow label="Pool (HE)" value={largeNumberFormat(poolSpsHE)} />
                </>
              ) : (
                <TooltipRow
                  label="SPS Pool"
                  value={poolBalancesError ? "Unavailable" : loading ? "Loading..." : "—"}
                />
              )}

              <Divider sx={{ my: 1 }} />

              <TooltipRow label="Total SPS" value={largeNumberFormat(totalSps)} bold />

              <Divider sx={{ my: 1 }} />

              <TooltipRow label="SPS for Rewards" value={largeNumberFormat(rankedSPS)} />
            </>
          }
        >
          <MyCard iconUrl={sps_icon_url} title="SPS" value={largeNumberFormat(totalSps)} />
        </BalanceTooltip>
      </Box>
    </Box>
  );
}
