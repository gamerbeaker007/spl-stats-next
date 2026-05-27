import { BucketServer } from "@/components/jackpot-prizes/BucketServer";
import { EditionTierCardsServer } from "@/components/jackpot-prizes/EditionTierCardsServer";
import LoadingSkeleton from "@/components/jackpot-prizes/LoadingSkeleton";
import { MusicCard } from "@/components/jackpot-prizes/MusicCard";
import { SkinsCard } from "@/components/jackpot-prizes/SkinsCard";
import { getCardDetails } from "@/lib/backend/actions/jackpot-prizes/cardDetails";
import { getJackpotMusic } from "@/lib/backend/actions/jackpot-prizes/jackpotMusic";
import { getJackpotSkins } from "@/lib/backend/actions/jackpot-prizes/jackpotSkins";
import { Alert, Box, Container, Divider, Typography } from "@mui/material";
import { Suspense } from "react";

async function JackpotPrizesContent() {
  let jackpotSkins, jackpotMusicData, cardDetails;
  try {
    [jackpotSkins, jackpotMusicData, cardDetails] = await Promise.all([
      getJackpotSkins(),
      getJackpotMusic(),
      getCardDetails(),
    ]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Failed to load jackpot data: {errorMessage}</Alert>
      </Container>
    );
  }

  const { chestMusic, frontierMusic } = jackpotMusicData;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
      {/* Second Part - Jackpot Skins Data */}
      <Typography variant="h4" component="h2" gutterBottom>
        Jackpot Skins Data
      </Typography>
      <Alert severity="info" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="body2" component="div">
          <strong>Found in the ultimate chests as jackpot prizes</strong>
          <br />
          • Ultimate: 1%
          <br />
        </Typography>
      </Alert>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 3,
        }}
      >
        {jackpotSkins.map((item) => (
          <SkinsCard
            key={`jackpot-skins-${item.skin_detail_id}`}
            item={item}
            cardDetails={cardDetails}
          />
        ))}
      </Box>
      {jackpotSkins.length === 0 && (
        <Box textAlign="center" mt={4}>
          <Typography variant="h6" color="text.secondary">
            No jackpot skins data available
          </Typography>
        </Box>
      )}
      <Divider sx={{ my: 4 }} />
      {/* Third Part - Chest Jackpot Music Data */}
      <Typography variant="h4" component="h2" gutterBottom>
        Jackpot Music (Chest)
      </Typography>
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2" component="div">
          <strong>Found in the minor chest as jackpot prizes</strong>
          <br />• Minor: 0.05%
        </Typography>
      </Alert>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 3,
          mb: 3,
        }}
      >
        {chestMusic.map((item) => (
          <MusicCard key={`chest-music-${item.item_detail_id}`} item={item} />
        ))}
      </Box>
      {chestMusic.length === 0 && (
        <Box textAlign="center" mb={3}>
          <Typography variant="h6" color="text.secondary">
            No chest jackpot music data available
          </Typography>
        </Box>
      )}
      <Divider sx={{ my: 4 }} />
      {/* Fourth Part - Frontier Jackpot Music Data */}
      <Typography variant="h4" component="h2" gutterBottom>
        Jackpot Music (Frontier)
      </Typography>
      <Alert severity="info" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="body2" component="div">
          <strong>Every claim (5 wins) 0.05% odds</strong>
          <br />• Maximum 3 per day
        </Typography>
      </Alert>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 3,
        }}
      >
        {frontierMusic.map((item) => (
          <MusicCard key={`frontier-music-${item.item_detail_id}`} item={item} />
        ))}
      </Box>
      {frontierMusic.length === 0 && (
        <Box textAlign="center" mt={4}>
          <Typography variant="h6" color="text.secondary">
            No frontier jackpot music data available
          </Typography>
        </Box>
      )}
      <Divider sx={{ my: 4 }} />
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
          <br />
          • Ultimate: 8%
          <br />
        </Typography>
      </Alert>
      <Suspense fallback={<LoadingSkeleton />}>
        <BucketServer username="$JACKPOT" />
      </Suspense>
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
          <br />
          • Aurelius : 1.5%
          <br />
        </Typography>
      </Alert>

      <Suspense fallback={<LoadingSkeleton />}>
        <BucketServer username="$ETN_REWARD_FOILS" />
      </Suspense>
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
