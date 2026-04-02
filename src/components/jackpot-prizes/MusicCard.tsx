"use client";

import { WEB_URL } from "@/lib/utils/staticUrls";
import { MusicDisplayItem } from "@/types/jackpot-prizes/music";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { Box, Card, CardContent, CardMedia, Chip, Divider, Typography } from "@mui/material";
import { useState } from "react";

interface MusicCardProps {
  item: MusicDisplayItem;
}

export function MusicCard({ item }: MusicCardProps) {
  const { music_data, image_filename, name, total_quantity, print_limit } = item;
  const [imageError, setImageError] = useState(false);

  const imageUrl = `${WEB_URL}website/music/covers/${encodeURIComponent(image_filename)}`;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ position: "relative", paddingTop: "100%", backgroundColor: "grey.900" }}>
        {!imageError ? (
          <CardMedia
            component="img"
            image={imageUrl}
            alt={name}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={() => setImageError(true)}
          />
        ) : (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "grey.800",
            }}
          >
            <MusicNoteIcon sx={{ fontSize: 80, color: "grey.600" }} />
          </Box>
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column", p: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {name}
        </Typography>

        {music_data && (
          <>
            {music_data.long_name && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {music_data.long_name}
              </Typography>
            )}

            {music_data.artist && (
              <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                Artist: {music_data.artist}
              </Typography>
            )}

            {music_data.track_length && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Duration: {music_data.track_length}
              </Typography>
            )}
          </>
        )}

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {music_data?.series && (
            <Typography variant="caption" color="text.secondary">
              {music_data.series}
            </Typography>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Chip
              label={`${total_quantity} / ${print_limit}`}
              size="small"
              sx={{
                backgroundColor: "primary.dark",
                fontWeight: "bold",
              }}
            />
          </Box>

          {music_data?.burn_value && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Burn Value: {music_data.burn_value}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
