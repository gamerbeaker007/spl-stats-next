import type { CombinedPortfolioSnapshot } from "@/lib/backend/actions/portfolio-actions";
import type { CollectionEditionDetail } from "@/types/portfolio";
import { getEditionLabel } from "@/lib/shared/edition-utils";
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

function usd(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function num(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function editionName(edition: number): string {
  return getEditionLabel(edition) ?? `Edition ${edition}`;
}

export default function CollectionDetails({ snapshot }: Props) {
  const details = (snapshot.collectionDetails ?? []) as CollectionEditionDetail[];
  const sorted = [...details].sort((a, b) => a.edition - b.edition);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 2, mb: 1 }}>
        <Typography variant="h6">Collection</Typography>
        <Typography variant="body2" color="text.secondary">
          Market: <strong>{usd(snapshot.collectionMarketValue)}</strong> &nbsp;|&nbsp; List:{" "}
          <strong>{usd(snapshot.collectionListValue)}</strong>
        </Typography>
      </Box>
      {sorted.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No collection data available.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Edition</TableCell>
                <TableCell align="right">Cards</TableCell>
                <TableCell align="right">BCX</TableCell>
                <TableCell align="right">Market Value</TableCell>
                <TableCell align="right">List Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((d) => (
                <TableRow key={d.edition}>
                  <TableCell>{editionName(d.edition)}</TableCell>
                  <TableCell align="right">{num(d.numberOfCards)}</TableCell>
                  <TableCell align="right">{d.bcx.toFixed(0)}</TableCell>
                  <TableCell align="right">{usd(d.marketValue)}</TableCell>
                  <TableCell align="right">{usd(d.listValue)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ "& td": { borderTop: 2 } }}>
                <TableCell>
                  <strong>Total</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{num(sorted.reduce((s, d) => s + d.numberOfCards, 0))}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{sorted.reduce((s, d) => s + d.bcx, 0).toFixed(0)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{usd(snapshot.collectionMarketValue)}</strong>
                </TableCell>
                <TableCell align="right">
                  <strong>{usd(snapshot.collectionListValue)}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
