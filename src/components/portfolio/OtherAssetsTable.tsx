import type { CombinedPortfolioSnapshot } from "@/lib/backend/actions/portfolio-actions";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

interface Props {
  snapshot: CombinedPortfolioSnapshot;
}

interface AssetRow {
  asset: string;
  qty: string;
  value: number;
}

function usd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function qty(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export default function OtherAssetsTable({ snapshot }: Props) {
  const rows: AssetRow[] = [
    // Land & deeds
    { asset: "Land Deeds", qty: `${snapshot.deedsQty} deeds`, value: snapshot.deedsValue },
    {
      asset: "Land Resources",
      qty: qty(snapshot.landResourceQty),
      value: snapshot.landResourceValue,
    },

    // Liquidity pool
    { asset: "Liq. Pool — DEC", qty: qty(snapshot.liqPoolDecQty), value: snapshot.liqPoolDecValue },
    { asset: "Liq. Pool — SPS", qty: qty(snapshot.liqPoolSpsQty), value: snapshot.liqPoolSpsValue },

    // Other tokens
    { asset: "VOUCHER", qty: qty(snapshot.voucherQty), value: snapshot.voucherValue },
    { asset: "Credits", qty: qty(snapshot.creditsQty, 0), value: snapshot.creditsValue },
    { asset: "DEC-B", qty: qty(snapshot.decBQty), value: snapshot.decBValue },
    { asset: "VOUCHER-G", qty: qty(snapshot.voucherGQty), value: snapshot.voucherGValue },
    { asset: "License", qty: qty(snapshot.licenseQty, 0), value: snapshot.licenseValue },

    // Inventory
    { asset: "Inventory", qty: `${snapshot.inventoryQty} items`, value: snapshot.inventoryValue },
  ].filter((r) => r.value > 0 || parseFloat(r.qty) > 0);

  const totalValue = rows.reduce((s, r) => s + r.value, 0);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 1 }}>
        <Typography variant="h6">Other Assets</Typography>
        <Typography variant="body2" color="text.secondary">
          Total: <strong>{usd(totalValue)}</strong>
        </Typography>
      </Box>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No other asset data available.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Asset</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.asset}>
                  <TableCell>{r.asset}</TableCell>
                  <TableCell align="right">{r.qty}</TableCell>
                  <TableCell align="right">{usd(r.value)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ "& td": { borderTop: 2 } }}>
                <TableCell colSpan={2}>
                  <strong>Total</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{usd(totalValue)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
