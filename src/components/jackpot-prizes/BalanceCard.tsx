import { getTokenDisplayName, getTokenIcon } from "@/lib/frontend/jackpotTokenIcons";
import { SplBalance } from "@/types/spl/balances";
import { Avatar, Box, Card, CardContent, Typography } from "@mui/material";

export function BalanceCard({ item }: { item: SplBalance }) {
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", p: 3 }}
      >
        <Avatar
          src={getTokenIcon(item.token)}
          alt={item.token}
          sx={{
            width: 64,
            height: 64,
            mb: 2,
            backgroundColor: "transparent",
            border: "2px solid",
            borderColor: "divider",
          }}
        />

        <Typography variant="h6" fontWeight="bold" gutterBottom textAlign="center">
          {getTokenDisplayName(item.token)}
        </Typography>

        <Box sx={{ mt: "auto", pt: 2 }}>
          <Typography
            variant="h5"
            fontWeight="bold"
            color={item.balance > 0 ? "success.main" : "text.secondary"}
            textAlign="center"
          >
            {item.balance.toLocaleString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
