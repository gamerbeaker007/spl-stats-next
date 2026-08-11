import { credits_icon_url, dec_icon_url, sps_icon_url } from "@/lib/staticsIconUrls";
import { largeNumberFormat } from "@/lib/utils";
import { PlayerPoolBalances, SplBalance } from "@/types/spl/balances";
import { Avatar, Box, Card, Divider, Tooltip, Typography } from "@mui/material";

interface Props {
  balances?: SplBalance[];
  poolBalances?: PlayerPoolBalances;
}

const iconSize = 20;

const MyCard = ({ iconUrl, title, value }: { iconUrl: string; title: string; value: string }) => (
  <Card variant="outlined" sx={{ flex: 1 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Avatar src={iconUrl} sx={{ width: iconSize, height: iconSize, marginLeft: 0.5 }}>
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

export default function TopBalances({ balances, poolBalances }: Props) {
  // Extract balance values
  const credits = balances?.find((b) => b.token === "CREDITS")?.balance || 0;
  const dec = balances?.find((b) => b.token === "DEC")?.balance || 0;
  const decBound = balances?.find((b) => b.token === "DEC-B")?.balance || 0;
  const sps = balances?.find((b) => b.token === "SPS")?.balance || 0;
  const spsp = balances?.find((b) => b.token === "SPSP")?.balance || 0;
  const spspIn = balances?.find((b) => b.token === "SPSP-IN")?.balance || 0;
  const spspOut = balances?.find((b) => b.token === "SPSP-OUT")?.balance || 0;
  const rankedSPS = spsp + spspIn - spspOut;

  // Liquidity pool holdings. `/players/balances` covers the in-game wallet only,
  // so pool quantities are additive — nothing is double-counted here.
  const poolDecInGame = poolBalances?.inGameDecQty ?? 0;
  const poolDecHE = poolBalances?.heDecQty ?? 0;
  const poolSpsInGame = poolBalances?.inGameSpsQty ?? 0;
  const poolSpsHE = poolBalances?.heSpsQty ?? 0;
  const poolDec = poolBalances?.decQty ?? 0;
  const poolSps = poolBalances?.spsQty ?? 0;

  // Calculate totals
  const totalDec = dec + decBound + poolDec;
  const totalSps = sps + spsp + poolSps;

  return (
    <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
      {/* Box 1: Credits */}
      <MyCard iconUrl={credits_icon_url} title="Credits" value={largeNumberFormat(credits)} />
      {/* Box 2: DEC Total */}
      <Tooltip
        title={
          <Box>
            <Typography variant="body2">DEC: {largeNumberFormat(dec)}</Typography>
            <Typography variant="body2">DEC-B: {largeNumberFormat(decBound)}</Typography>
            <Typography variant="body2">
              DEC Pool (in-game): {largeNumberFormat(poolDecInGame)}
            </Typography>
            <Typography variant="body2">DEC Pool (HE): {largeNumberFormat(poolDecHE)}</Typography>

            <Box sx={{ mt: 1 }}>
              <Divider />
            </Box>
          </Box>
        }
        arrow
        placement="top"
      >
        <Box sx={{ flex: 1 }}>
          <MyCard iconUrl={dec_icon_url} title="DEC" value={largeNumberFormat(totalDec)} />
        </Box>
      </Tooltip>
      {/* Box 3: SPS Total */}
      <Tooltip
        title={
          <Box>
            <Typography variant="body2">SPS Liquid: {largeNumberFormat(sps)}</Typography>
            <Typography variant="body2">SPS Staked: {largeNumberFormat(spsp)}</Typography>
            <Typography variant="body2">SPS Delegated In: {largeNumberFormat(spspIn)}</Typography>
            <Typography variant="body2">SPS Delegated Out: {largeNumberFormat(spspOut)}</Typography>
            <Typography variant="body2">
              SPS Pool (in-game): {largeNumberFormat(poolSpsInGame)}
            </Typography>
            <Typography variant="body2">SPS Pool (HE): {largeNumberFormat(poolSpsHE)}</Typography>

            <Box sx={{ mt: 1 }}>
              <Divider />
            </Box>
            <Typography variant="body2">SPS for Rewards: {largeNumberFormat(rankedSPS)}</Typography>
          </Box>
        }
        arrow
        placement="top"
      >
        <Box sx={{ flex: 1 }}>
          <MyCard iconUrl={sps_icon_url} title="SPS" value={largeNumberFormat(totalSps)} />
        </Box>
      </Tooltip>
    </Box>
  );
}
