"use client";

import { DataFreshness } from "@/components/jackpot-prizes/DataFreshness";
import { SkinsCard } from "@/components/jackpot-prizes/SkinsCard";
import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchAccountSkins } from "@/lib/frontend/spl-browser-api";
import type { SplCardDetail } from "@/types/spl/cardDetails";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { Fragment } from "react";

interface Props {
  account: string;
  title: string;
  description: ReactNode;
  emptyMessage: string;
  cardDetails: SplCardDetail[];
}

export function AccountSkinsSection({
  account,
  title,
  description,
  emptyMessage,
  cardDetails,
}: Props) {
  const { data, loading, error, settledAt } = useAsyncData(
    `jackpot-skins:${account}`,
    () => fetchAccountSkins(account),
    { errorMessage: `Could not load ${title.toLowerCase()}` }
  );

  return (
    <Fragment>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          {title}
        </Typography>
        <DataFreshness timestamp={settledAt} source="browser" provider="Splinterlands" />
      </Stack>

      <Alert severity="info" sx={{ mt: 3, mb: 4 }}>
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
            {data?.map((item) => (
              <SkinsCard
                key={`${account}-${item.skin_detail_id}`}
                item={item}
                cardDetails={cardDetails}
              />
            ))}
          </Box>
          {data?.length === 0 && (
            <Box textAlign="center" mt={4}>
              <Typography variant="h6" color="text.secondary">
                {emptyMessage}
              </Typography>
            </Box>
          )}
        </>
      )}
      <Box sx={{ my: 4, borderBottom: 1, borderColor: "divider" }} />
    </Fragment>
  );
}
