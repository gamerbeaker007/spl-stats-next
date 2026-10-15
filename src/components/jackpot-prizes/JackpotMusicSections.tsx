"use client";

import { DataFreshness } from "@/components/jackpot-prizes/DataFreshness";
import { MusicCard } from "@/components/jackpot-prizes/MusicCard";
import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchAccountInventory } from "@/lib/frontend/spl-browser-api";
import type { MusicDisplayItem, MusicItemData } from "@/types/jackpot-prizes/music";
import type { SplInventoryItem } from "@/types/spl/jackpot";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useMemo } from "react";

function groupMusicItems(items: SplInventoryItem[]): MusicDisplayItem[] {
  const grouped = new Map<number, MusicDisplayItem>();
  for (const item of items) {
    const existing = grouped.get(item.item_detail_id);
    if (existing) {
      existing.total_quantity += item.quantity;
      continue;
    }

    let musicData: MusicItemData | null = null;
    try {
      musicData = JSON.parse(item.data) as MusicItemData;
    } catch {
      console.warn(`Failed to parse music data for item ${item.item_detail_id}`);
    }

    grouped.set(item.item_detail_id, {
      item_detail_id: item.item_detail_id,
      name: item.name,
      image_filename: item.image_filename,
      print_limit: item.print_limit,
      total_printed: item.total_printed,
      total_quantity: item.quantity,
      music_data: musicData,
    });
  }
  return Array.from(grouped.values());
}

function MusicSection({
  title,
  description,
  items,
  loading,
  error,
  checkedAt,
}: {
  title: string;
  description: ReactNode;
  items: MusicDisplayItem[];
  loading: boolean;
  error: string | null;
  checkedAt: number | null;
}) {
  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          {title}
        </Typography>
        <DataFreshness timestamp={checkedAt} source="browser" provider="Splinterlands" />
      </Stack>
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2" component="div">
          {description}
        </Typography>
      </Alert>
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <>
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
            {items.map((item) => (
              <MusicCard key={`${title}-${item.item_detail_id}`} item={item} />
            ))}
          </Box>
          {items.length === 0 && (
            <Box textAlign="center" mt={4}>
              <Typography variant="h6" color="text.secondary">
                No {title.toLowerCase()} data available
              </Typography>
            </Box>
          )}
        </>
      )}
      <Box sx={{ my: 4, borderBottom: 1, borderColor: "divider" }} />
    </>
  );
}

export default function JackpotMusicSections() {
  const { data, loading, error, settledAt } = useAsyncData(
    "jackpot-music-accounts",
    async () => {
      const [chestInventory, frontierInventory] = await Promise.all([
        fetchAccountInventory("$MUSIC_JACKPOT"),
        fetchAccountInventory("$FRONTIER_MUSIC_JACKPOT"),
      ]);
      return {
        chestMusic: groupMusicItems(chestInventory.filter((item) => item.type === "Music")),
        frontierMusic: groupMusicItems(frontierInventory.filter((item) => item.type === "Music")),
      };
    },
    { errorMessage: "Could not load jackpot music data" }
  );

  const chestMusic = useMemo(() => data?.chestMusic ?? [], [data]);
  const frontierMusic = useMemo(() => data?.frontierMusic ?? [], [data]);

  return (
    <>
      <MusicSection
        title="Jackpot Music (Chest)"
        description={
          <>
            <strong>Found in the minor chest as jackpot prizes</strong>
            <br />• Minor: 0.05%
          </>
        }
        items={chestMusic}
        loading={loading}
        error={error}
        checkedAt={settledAt}
      />
      <MusicSection
        title="Jackpot Music (Frontier)"
        description={
          <>
            <strong>Every claim (5 wins) 0.05% odds</strong>
            <br />• Maximum 3 per day
          </>
        }
        items={frontierMusic}
        loading={loading}
        error={error}
        checkedAt={settledAt}
      />
    </>
  );
}
