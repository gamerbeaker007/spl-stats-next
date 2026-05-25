import { getFrontierJackpotBucket } from "@/lib/backend/actions/jackpot-prizes/frontierJackpotBucket";
import { Alert, Box } from "@mui/material";
import { FrontierBucketOverview } from "./FrontierBucketOverview";

export async function FrontierBucketServer() {
  let result;
  try {
    result = await getFrontierJackpotBucket();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return (
      <Box p={2}>
        <Alert severity="warning">Could not load bucket data: {message}</Alert>
      </Box>
    );
  }

  return <FrontierBucketOverview cards={result.cards} />;
}
