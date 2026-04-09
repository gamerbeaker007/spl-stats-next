import { RewardSummary } from "@/types/parsedHistory";
import { Box, Typography } from "@mui/material";
import { MdMusicNote } from "react-icons/md";

interface Props {
  totalMusic: RewardSummary["totalMusic"];
  /** Optional map of music_detail_id → image URL, resolved from vapi/market/landing. */
  musicImages?: Record<number, string>;
}

export function Music({ totalMusic, musicImages }: Props) {
  const entries = Object.entries(totalMusic);
  if (entries.length === 0) return null;

  return (
    <Box border="1px solid" borderRadius={2} p={2}>
      <Typography variant="h6" gutterBottom>
        Music
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2}>
        {entries.map(([idStr, data]) => {
          const numId = Number(idStr);
          const imageUrl = musicImages?.[numId];

          return (
            <Box
              key={idStr}
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={0.5}
              width={90}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={data.name}
                  width={80}
                  height={80}
                  style={{ objectFit: "contain", borderRadius: 6, display: "block" }}
                />
              ) : (
                <Box
                  width={80}
                  height={80}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  sx={{ bgcolor: "action.hover", borderRadius: 1.5 }}
                >
                  <MdMusicNote size={36} />
                </Box>
              )}
              <Typography
                variant="caption"
                align="center"
                sx={{ fontSize: 10, lineHeight: 1.2 }}
                noWrap
              >
                {data.name}
              </Typography>
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: 11 }}>
                ×{data.quantity}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
