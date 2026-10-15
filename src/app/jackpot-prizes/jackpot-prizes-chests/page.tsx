import { AccountSkinsSection } from "@/components/jackpot-prizes/AccountSkinsSection";
import { BucketClient } from "@/components/jackpot-prizes/BucketClient";
import { EditionTierCardsServer } from "@/components/jackpot-prizes/EditionTierCardsServer";
import JackpotMusicSections from "@/components/jackpot-prizes/JackpotMusicSections";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { Alert, Container, Divider, Typography } from "@mui/material";
import { Suspense } from "react";

async function JackpotPrizesContent() {
  let cardDetails;
  try {
    cardDetails = await getCardDetails();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load jackpot data: {errorMessage}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
      <AccountSkinsSection
        account="$MINOR_JACKPOT_SKINS"
        title="Minor Chest Jackpot Skins"
        description={
          <>
            <strong>Found in the minor chests as jackpot prizes</strong>
            <br />• Minor: 1%
          </>
        }
        emptyMessage="No minor jackpot skins data available"
        cardDetails={cardDetails}
      />
      <AccountSkinsSection
        account="$MAJOR_JACKPOT_SKINS"
        title="Major Chest Jackpot Skins"
        description={
          <>
            <strong>Found in the major chests as jackpot prizes</strong>
            <br />• Major: 2%
          </>
        }
        emptyMessage="No major jackpot skins data available"
        cardDetails={cardDetails}
      />
      <AccountSkinsSection
        account="$JACKPOT_SKINS"
        title="Ultimate Chest Jackpot Skins"
        description={
          <>
            <strong>Found in the ultimate chests as jackpot prizes</strong>
            <br />• Ultimate: 3%
          </>
        }
        emptyMessage="No jackpot skins data available"
        cardDetails={cardDetails}
      />
      <AccountSkinsSection
        account="$FRONTIER_SKIN_JACKPOT"
        title="Frontier Jackpot Skins"
        description={
          <>
            <strong>Found in the frontier as jackpot prizes</strong>
            <br />• Frontier daily rewards: 2%
          </>
        }
        emptyMessage="No frontier jackpot skins data available"
        cardDetails={cardDetails}
      />

      <JackpotMusicSections />

      <Typography variant="h4" component="h2" gutterBottom>
        Jackpot Card Data Chest Reward Foils
      </Typography>
      <Alert severity="info" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="body2" component="div">
          <strong>Found as part of jackpot in reward chest</strong>
          <br />
          • Minor: 0.08%
          <br />
          • Major: 0.8%
          <br />• Ultimate: 8%
        </Typography>
      </Alert>
      <BucketClient username="$JACKPOT" cardDetails={cardDetails} />
      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" component="h2" gutterBottom>
        Jackpot Card Data ETN Reward Foils
      </Typography>
      <Alert severity="info" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="body2" component="div">
          <strong>Found as part of jackpot in reward chest</strong>
          <br />
          • Volt: 0.005%
          <br />
          • Arcing : 0.05%
          <br />
          • Hyper: 0.25%
          <br />• Aurelius : 1.5%
        </Typography>
      </Alert>
      <BucketClient username="$ETN_REWARD_FOILS" cardDetails={cardDetails} />
      <Suspense fallback={<LoadingSkeleton />}>
        <EditionTierCardsServer
          edition={17}
          tier={14}
          title="Jackpot Chest Reward Foils"
          subtitle="Edition 17 Tier 14 special cards"
          recentWinnersLabel="Recent Winners (last 8 days)"
        />
      </Suspense>
    </Container>
  );
}

export default function JackpotPrizesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <JackpotPrizesContent />
    </Suspense>
  );
}
