"use client";

import { RecentWinnersCarousel } from "@/components/jackpot-prizes/RecentWinnersCarousel";
import { useRecentWinners } from "@/hooks/jackpot-prizes/useRecentWinners";
import { RecentWinner } from "@/types/jackpot-prizes/shared";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { Box, Divider, Skeleton, Typography } from "@mui/material";
import { useMemo } from "react";

export interface RecentWinnersConfig {
  edition: number;
  tier?: number;
  label: string;
}

interface EntryProps {
  config: RecentWinnersConfig;
  cardDetails: SplCardDetail[];
}

function SingleWinnersEntry({ config, cardDetails }: EntryProps) {
  const { winners, loading } = useRecentWinners(config.edition);

  const filtered: RecentWinner[] = useMemo(() => {
    if (config.tier === undefined) return winners;
    return winners.filter(
      (w) => cardDetails.find((c) => c.id === w.card_detail_id)?.tier === config.tier
    );
  }, [winners, config.tier, cardDetails]);

  return (
    <Box sx={{ mb: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        {config.label}
      </Typography>
      {loading ? (
        <Box sx={{ display: "flex", gap: "10px", py: 1, overflow: "hidden", maxWidth: "100%" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={120} height={200} sx={{ flexShrink: 0 }} />
          ))}
        </Box>
      ) : (
        <RecentWinnersCarousel winners={filtered} cardDetails={cardDetails} />
      )}
    </Box>
  );
}

interface Props {
  configs: RecentWinnersConfig[];
  cardDetails: SplCardDetail[];
}

export function MultiRecentWinnersSection({ configs, cardDetails }: Props) {
  return (
    <>
      {configs.map((config) => (
        <SingleWinnersEntry
          key={`${config.edition}-${config.tier ?? "all"}`}
          config={config}
          cardDetails={cardDetails}
        />
      ))}
      <Divider sx={{ mb: 4 }} />
    </>
  );
}
