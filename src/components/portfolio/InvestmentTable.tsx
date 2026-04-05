import type { InvestmentEntry } from "@/lib/backend/actions/portfolio-actions";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

interface Props {
  investments: InvestmentEntry[];
  totalInvested: number;
}

function usd(value: number): string {
  return `$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InvestmentTable({ investments, totalInvested }: Props) {
  if (investments.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Investment History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No investment entries recorded. Use the Admin page to import or add investments.
        </Typography>
      </Box>
    );
  }

  // Build running total
  let running = 0;
  const rows = investments.map((inv) => {
    running += inv.amount;
    return { ...inv, running };
  });

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 1 }}>
        <Typography variant="h6">Investment History</Typography>
        <Typography variant="body2" color="text.secondary">
          Total invested:{" "}
          <strong>
            $
            {totalInvested.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
        </Typography>
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Amount ($)</TableCell>
              <TableCell align="right">Running Total ($)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.date}</TableCell>
                <TableCell>{inv.username}</TableCell>
                <TableCell>
                  <Chip
                    label={inv.amount >= 0 ? "Deposit" : "Withdraw"}
                    color={inv.amount >= 0 ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ color: inv.amount >= 0 ? "success.main" : "error.main" }}
                >
                  {inv.amount >= 0 ? "+" : "-"}
                  {usd(inv.amount)}
                </TableCell>
                <TableCell align="right">{usd(inv.running)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
