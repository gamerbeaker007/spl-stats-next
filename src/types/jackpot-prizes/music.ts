export interface MusicItemData {
  long_name: string;
  artist: string;
  track_length: string;
  series: string;
  burn_value: string;
}

/**
 * Display-ready music item with aggregated quantities.
 * Groups multiple inventory items with same item_detail_id.
 */
export interface MusicDisplayItem {
  item_detail_id: number;
  name: string;
  image_filename: string;
  print_limit: number;
  total_printed: number;
  total_quantity: number;
  music_data: MusicItemData | null;
}

export interface JackpotMusicData {
  chestMusic: MusicDisplayItem[];
  frontierMusic: MusicDisplayItem[];
}
