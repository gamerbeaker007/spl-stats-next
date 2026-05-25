import ClientCardGrid from "@/components/jackpot-prizes/ClientCardGrid";
import { getEdition17Tier15Cards } from "@/lib/backend/actions/jackpot-prizes/edition17Tier15Cards";
import { Alert, Box } from "@mui/material";

export async function Edition17SpecialCardsServer() {
  let data;
  try {
    data = await getEdition17Tier15Cards();
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
      title="Frontier Extra Cards"
      subtitle="Extra cards from the frontier era"
      recentWinnersConfigs={[
        { edition: 17, tier: 15, label: "Recent Winners – Frontier Extra (last 8 days)" },
      ]}
    />
  );
}
