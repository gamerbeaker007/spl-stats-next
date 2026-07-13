import { etn_icon_url, evp_icon_url } from "@/lib/staticsIconUrls";
import { largeNumberFormat } from "@/lib/utils";
import { SplBalance } from "@/types/spl/balances";
import { Avatar, Box, Card, Tooltip, Typography } from "@mui/material";

interface Props {
  balances?: SplBalance[];
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

export default function ElectroneumBalances({ balances }: Readonly<Props>) {
  // Extract balance values
  const etn = balances?.find((b) => b.token === "ETN")?.balance || 0;
  const evp = balances?.find((b) => b.token === "EVP")?.balance || 0;

  return (
    <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
      {/* Box 4: ETN /EVP Total */}
      <Tooltip
        title={
          <Box>
            <Typography variant="body2">ETN: {largeNumberFormat(etn)}</Typography>
            <Typography variant="body2">EVP: {largeNumberFormat(evp)}</Typography>
          </Box>
        }
        arrow
        placement="top"
      >
        <Box display={"flex"} flexWrap={"wrap"} width={"100%"} gap={2}>
          <MyCard iconUrl={etn_icon_url} title="ETN" value={largeNumberFormat(etn)} />
          <MyCard iconUrl={evp_icon_url} title="EVP" value={largeNumberFormat(evp)} />
        </Box>
      </Tooltip>
    </Box>
  );
}
