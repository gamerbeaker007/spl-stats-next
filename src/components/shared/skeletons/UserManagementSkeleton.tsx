import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material";

export default function UserManagementSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Header row */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Skeleton variant="text" width={200} height={36} />
          <Skeleton variant="rounded" width={130} height={36} />
        </Box>

        {/* Main account card */}
        <Card>
          <CardContent>
            <Skeleton variant="text" width={220} height={28} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" />
          </CardContent>
        </Card>

        {/* Monitored accounts card */}
        <Card>
          <CardContent>
            <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
            {[1, 2, 3].map((i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 1,
                }}
              >
                <Skeleton variant="text" width={140} height={24} />
                <Skeleton variant="circular" width={32} height={32} />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
