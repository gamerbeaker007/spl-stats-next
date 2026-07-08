"use client";

import { abilityIconUrl } from "@/lib/shared/card-utils";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { Box, CircularProgress, Stack, Tooltip, Typography } from "@mui/material";
import type { Meta, StoryObj } from "@storybook/react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

function AbilityGallery() {
  const [abilities, setAbilities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("https://api.splinterlands.com/cards/get_details");
        if (!response.ok) {
          throw new Error(`Failed to load card details: ${response.status}`);
        }

        const data = (await response.json()) as SplCardDetail[];
        const unique = new Set<string>();
        for (const detail of data) {
          const abilities = detail.stats?.abilities ?? [];

          // Archons: ["Flying", "Recharge"]
          // Units: [["Flying"], ["Flying", "Recharge"], ...]
          const levels =
            abilities.length > 0 && typeof abilities[0] === "string" ? [abilities] : abilities;

          for (const levelAbilities of levels) {
            for (const ability of levelAbilities ?? []) {
              const normalized = String(ability).trim();
              if (normalized) {
                unique.add(normalized);
              }
            }
          }
        }

        if (!active) return;
        setAbilities(Array.from(unique).sort((a, b) => a.localeCompare(b)));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unknown error loading abilities");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const entries = useMemo(
    () =>
      abilities.map((ability) => ({
        ability,
      })),
    [abilities]
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Ability Icon Verification</Typography>
      <Typography variant="body2" color="text.secondary">
        Unique abilities discovered from SPL card details: {entries.length}
      </Typography>

      {loading && <CircularProgress size={24} />}
      {error && (
        <Typography variant="body2" color="warning.main">
          API fallback in use: {error}
        </Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 1,
        }}
      >
        {entries.map((entry) => (
          <Tooltip key={entry.ability} title={entry.ability} placement="top" arrow>
            <Box
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                p: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Image
                src={abilityIconUrl(entry.ability)}
                alt={entry.ability}
                width={28}
                height={28}
              />
              <Stack spacing={0}>
                <Typography variant="body2" fontWeight={600}>
                  {entry.ability}
                </Typography>
              </Stack>
            </Box>
          </Tooltip>
        ))}
      </Box>
    </Stack>
  );
}

const meta: Meta<typeof AbilityGallery> = {
  title: "Cards/BuyMissingCC/Ability Icons",
  component: AbilityGallery,
};

export default meta;
type Story = StoryObj<typeof AbilityGallery>;

export const Default: Story = {};
