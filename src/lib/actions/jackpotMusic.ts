import { fetchFrontierJackpotMusic, fetchJackpotMusic } from "@/lib/backend/api/spl/spl-api";
import { JackpotMusicData, MusicDisplayItem, MusicItemData } from "@/types/jackpot-prizes/music";
import { SplInventoryItem } from "@/types/spl/jackpot";

/**
 * Groups inventory items by item_detail_id and sums quantities
 */
function groupMusicItems(items: SplInventoryItem[]): MusicDisplayItem[] {
  const grouped = new Map<number, MusicDisplayItem>();

  for (const item of items) {
    const existing = grouped.get(item.item_detail_id);

    if (existing) {
      // Add quantity to existing item
      existing.total_quantity += item.quantity;
    } else {
      // Parse music data
      let musicData: MusicItemData | null = null;
      try {
        musicData = JSON.parse(item.data) as MusicItemData;
      } catch {
        console.warn(`Failed to parse music data for item ${item.item_detail_id}`);
      }

      // Create new display item
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
  }

  return Array.from(grouped.values());
}

/**
 * Get jackpot music items from both $MUSIC_JACKPOT (Chest) and $FRONTIER_MUSIC_JACKPOT
 * Cached with 'minutes' lifetime since inventory changes periodically
 * Returns separate arrays for each source
 */
export async function getJackpotMusic(): Promise<JackpotMusicData> {
  console.info("Fetching jackpot music items");
  try {
    const [musicJackpot, frontierMusicJackpot] = await Promise.all([
      fetchJackpotMusic(),
      fetchFrontierJackpotMusic(),
    ]);

    // Group and aggregate quantities for each source
    const chestMusic = groupMusicItems(musicJackpot);
    const frontierMusic = groupMusicItems(frontierMusicJackpot);

    console.info(
      `Successfully fetched ${chestMusic.length} chest music items and ${frontierMusic.length} frontier music items`
    );

    return {
      chestMusic,
      frontierMusic,
    };
  } catch (error) {
    console.error(
      `Failed to fetch jackpot music: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}
