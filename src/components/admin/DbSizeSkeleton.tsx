import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TableContainer from "@mui/material/TableContainer";
import Typography from "@mui/material/Typography";

export default function DbSizeSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h5">Database Size</Typography>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Skeleton variant="rounded" width={80} height={24} />
              <Skeleton variant="text" width={160} />
            </Stack>
          </CardContent>
        </Card>
        <TableContainer component={Paper} variant="outlined">
          <Box sx={{ p: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="text" height={40} sx={{ my: 0.5 }} />
            ))}
          </Box>
        </TableContainer>
      </Stack>
    </Box>
  );
}
