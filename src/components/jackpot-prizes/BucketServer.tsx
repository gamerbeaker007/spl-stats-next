import { getAccountBucket } from "@/lib/backend/actions/jackpot-prizes/accountBucket";
import { Alert, Box } from "@mui/material";
import { FrontierBucketOverview } from "./FrontierBucketOverview";

interface Props {
  username: string;
}

export async function BucketServer({ username }: Props) {
  let result;
  try {
    result = await getAccountBucket(username);
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
