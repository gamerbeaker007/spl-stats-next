import { Box, Paper, Skeleton, Stack, TableContainer, Typography } from "@mui/material";

export default function SupportDonationsSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        <Typography variant="h5">Support Donations</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Box sx={{ p: 2 }}>
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} variant="text" height={38} sx={{ my: 0.5 }} />
            ))}
          </Box>
        </TableContainer>
      </Stack>
    </Box>
  );
}
