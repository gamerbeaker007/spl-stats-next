"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export default function BattlePageSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      {/* Top cards grid */}
      <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
      <Stack direction="row" spacing={2} sx={{ mb: 4, flexWrap: "wrap", gap: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={140} height={220} />
        ))}
      </Stack>
      {/* Table */}
      <Skeleton variant="text" width={150} height={28} sx={{ mb: 1 }} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={48} sx={{ mb: 1 }} />
      ))}
    </Box>
  );
}
