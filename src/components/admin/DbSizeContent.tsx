import { getDatabaseSize } from "@/lib/backend/db/stats";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

function sizeColor(bytes: number): "success" | "warning" | "error" {
  const mb = bytes / 1024 / 1024;
  if (mb < 1000) return "success";
  if (mb < 10000) return "warning";
  return "error";
}

export default async function DbSizeContent() {
  const data = await getDatabaseSize();

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h5">Database Size</Typography>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip label={data.totalSize} color={sizeColor(data.totalBytes)} size="small" />
              <Typography variant="body2" color="text.secondary">
                Total database size
              </Typography>
            </Stack>
          </CardContent>
        </Card>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Table</TableCell>
                <TableCell align="right">Size</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.tables.map((row) => (
                <TableRow key={row.tableName}>
                  <TableCell>{row.tableName}</TableCell>
                  <TableCell align="right">{row.totalSize}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Box>
  );
}
