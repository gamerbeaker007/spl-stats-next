import ClientCardGrid from "@/components/jackpot-prizes/ClientCardGrid";
import { getEditionTierCards } from "@/lib/backend/actions/jackpot-prizes/editionTierCards";
import { Alert, Box } from "@mui/material";

interface Props {
  edition: number;
  tier: number;
  title: string;
  subtitle?: string;
  recentWinnersLabel: string;
}

export async function EditionTierCardsServer({
  edition,
  tier,
  title,
  subtitle,
  recentWinnersLabel,
}: Props) {
  let data;
  try {
    data = await getEditionTierCards(edition, tier);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return (
      <Box p={3}>
        <Alert severity="warning">Could not load special cards: {errorMessage}</Alert>
      </Box>
    );
  }

  if (data.prizeData.length === 0) return null;

  return (
    <ClientCardGrid
      prizeData={data.prizeData}
      cardDetails={data.cardDetails}
      title={title}
      subtitle={subtitle}
      recentWinnersConfigs={[{ edition, tier, label: recentWinnersLabel }]}
    />
  );
}
