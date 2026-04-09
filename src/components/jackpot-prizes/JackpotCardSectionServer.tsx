import { JackpotCardSectionClient } from "@/components/jackpot-prizes/JackpotCardSectionClient";
import { getJackpotCards } from "@/lib/backend/actions/jackpot-prizes/jackpotCards";
import { SplCardDetail } from "@/types/jackpot-prizes/shared";
import { Alert, Box } from "@mui/material";

interface Props {
  cardDetails: SplCardDetail[];
}

export async function JackpotCardSectionServer({ cardDetails }: Props) {
  let jackpotCards;
  try {
    jackpotCards = await getJackpotCards();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return (
      <Box p={3}>
        <Alert severity="error">Failed to load jackpot card data: {errorMessage}</Alert>
      </Box>
    );
  }

  return <JackpotCardSectionClient jackpotCards={jackpotCards} cardDetails={cardDetails} />;
}
