import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function BattleImportSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Battle History CSV Import
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Skeleton variant="rounded" width={140} height={36} />
          <Skeleton variant="rounded" width={90} height={36} />
        </Stack>
      </Paper>
    </Box>
  );
}
