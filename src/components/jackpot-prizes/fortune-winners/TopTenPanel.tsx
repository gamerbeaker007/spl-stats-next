"use client";

import { TopFortuneWinner } from "@/types/fortune/fortune";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Image from "next/image";

interface Props {
  title: string;
  icon: string;
  iconAlt: string;
  winners: TopFortuneWinner[];
  loading: boolean;
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function TopTenPanel({ title, icon, iconAlt, winners, loading }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        flex: 1,
        minWidth: 280,
        p: 2,
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Draw icon above the header */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            bgcolor: "action.hover",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Image src={icon} alt={iconAlt} width={30} height={30} />
        </Box>
        <Typography variant="h6">{title}</Typography>
      </Stack>

      <Divider sx={{ mb: 1 }} />

      {loading ? (
        <Stack spacing={1} mt={1}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={28} />
          ))}
        </Stack>
      ) : winners.length === 0 ? (
        <Alert severity="info" sx={{ mt: 1 }}>
          No winners found yet.
        </Alert>
      ) : (
        <Stack divider={<Divider flexItem />} spacing={0.5}>
          {winners.map((winner, index) => (
            <Stack
              key={winner.player}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ py: 0.5 }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: index < 3 ? "#000" : "text.secondary",
                  bgcolor: index < 3 ? MEDAL_COLORS[index] : "action.selected",
                }}
              >
                {index + 1}
              </Box>
              <Typography sx={{ flex: 1, fontWeight: 500 }} noWrap title={winner.player}>
                {winner.player}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                {winner.count} {winner.count === 1 ? "win" : "wins"}
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ flexShrink: 0, minWidth: 70, textAlign: "right" }}
              >
                {winner.entries.toLocaleString()} entries
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
