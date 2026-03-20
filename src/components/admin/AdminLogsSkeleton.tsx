import { Box, Skeleton, Stack } from "@mui/material";

export default function AdminLogsSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Skeleton variant="text" width={200} height={40} />
        <Stack direction="row" spacing={1}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" width={80} height={32} />
          ))}
        </Stack>
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={48} />
        ))}
      </Stack>
    </Box>
  );
}
