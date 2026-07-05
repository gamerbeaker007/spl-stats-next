"use client";

import ScrollableTableContainer from "@/components/shared/ScrollableTableContainer";
import { abilityIconUrl } from "@/lib/shared/card-utils";
import { getBracketLevelRange, LEAGUE_BRACKETS } from "@/lib/shared/league-brackets";
import {
  armor_icon_url,
  attack_icon_url,
  credits_icon_url,
  dec_icon_url,
  health_icon_url,
  magic_icon_url,
  mana_icon_url,
  ranged_icon_url,
  speed_icon_url,
} from "@/lib/staticsIconUrls";
import { findLeagueLogoUrl } from "@/lib/utils";
import type { LeagueBracket } from "@/types/buy-missing-cc";
import type { CardStats } from "@/types/spl/cardDetails";
import {
  Alert,
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";

const BRACKET_LOGO_LEAGUE: Record<LeagueBracket, number> = {
  wood: 0,
  bronze: 3,
  silver: 6,
  gold: 9,
  diamond: 12,
  champion: 15,
};

const STAT_ICON_URL: Record<Exclude<keyof CardStats, "abilities">, string> = {
  mana: mana_icon_url,
  attack: attack_icon_url,
  ranged: ranged_icon_url,
  magic: magic_icon_url,
  armor: armor_icon_url,
  health: health_icon_url,
  speed: speed_icon_url,
};

type TargetRow = {
  level: number;
  playableBrackets: LeagueBracket[];
  targetCc: number;
  ownedBcx: number;
  neededBcx: number;
  dec: number;
  credits: number;
  usd: number;
  planItems: Array<{
    account: string;
    marketId: string;
    uid?: string;
    cardDetailId: number;
    cardName: string;
    edition: number;
    foil: number;
    level: number;
    cc: number;
    priceUsd: number;
    priceDec: number;
    priceCredits: number;
    seller?: string;
  }>;
  exact: boolean;
  abilities: string[];
};

interface TargetLevelTabContentProps {
  combineRatesAvailable: boolean;
  dynamicStats: Array<{ key: keyof CardStats; label: string }>;
  targetRows: TargetRow[];
  cardStats?: CardStats;
  cardRarity?: number;
  targetBracket: LeagueBracket | "";
  accountHighestLevel: number;
  accountHighestCc: number;
  accountTotalCc: number;
  isHighestCcAtMaxLevel: boolean;
  canBuy: boolean;
  buyBusy: boolean;
  balance: { DEC: number; CREDITS: number };
  onAddToPurchasePlan: (items: TargetRow["planItems"]) => void;
  onRunCheckoutForPlan: (items: TargetRow["planItems"], currency: "DEC" | "CREDITS") => void;
}

export default function TargetLevelTabContent({
  combineRatesAvailable,
  dynamicStats,
  targetRows,
  cardStats,
  cardRarity,
  targetBracket,
  accountHighestLevel,
  accountHighestCc,
  accountTotalCc,
  isHighestCcAtMaxLevel,
  canBuy,
  buyBusy,
  balance,
  onAddToPurchasePlan,
  onRunCheckoutForPlan,
}: Readonly<TargetLevelTabContentProps>) {
  if (!combineRatesAvailable) {
    return (
      <Alert severity="warning">
        Target-level calculations are unavailable for this card configuration.
      </Alert>
    );
  }

  return (
    <ScrollableTableContainer>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Playable Bracket</TableCell>
            <TableCell>Level</TableCell>
            {dynamicStats.map((row) => (
              <TableCell key={row.key}>
                <Tooltip title={row.label}>
                  <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                    <Image
                      src={STAT_ICON_URL[row.key as Exclude<keyof CardStats, "abilities">]}
                      alt={row.label}
                      width={18}
                      height={18}
                    />
                  </Box>
                </Tooltip>
              </TableCell>
            ))}
            <TableCell>Abilities</TableCell>
            <TableCell>Target BCX</TableCell>
            <TableCell>Owned BCX</TableCell>
            <TableCell>Needed BCX</TableCell>
            <TableCell>Upgrade Cost ($)</TableCell>
            <TableCell>Add to Cart</TableCell>
            <TableCell>Buy Credits</TableCell>
            <TableCell>Buy DEC</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {targetRows.map((row) => {
            const highlighted = row.level === accountHighestLevel;

            const [targetMin, targetMax] =
              cardRarity && targetBracket !== ""
                ? getBracketLevelRange(targetBracket, cardRarity)
                : [null, null];

            const targetBottom = row.level === targetMin;
            const targetTop = row.level === targetMax;

            return (
              <TableRow
                key={row.level}
                selected={highlighted}
                sx={{
                  "& td": {
                    ...(targetBottom && {
                      borderTop: "2px solid",
                      borderTopColor: "error.main",
                    }),

                    ...(targetTop && {
                      borderBottom: "2px solid",
                      borderBottomColor: "error.main",
                    }),
                  },
                }}
              >
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                    {row.playableBrackets.map((bracket) => {
                      const logo = findLeagueLogoUrl("modern", BRACKET_LOGO_LEAGUE[bracket]);
                      if (!logo) return null;
                      return (
                        <Tooltip
                          key={`${row.level}-${bracket}`}
                          title={LEAGUE_BRACKETS[bracket].label}
                        >
                          <Box sx={{ display: "inline-flex" }}>
                            <Image
                              src={logo}
                              alt={LEAGUE_BRACKETS[bracket].label}
                              width={18}
                              height={18}
                            />
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </TableCell>
                <TableCell>{row.level}</TableCell>
                {dynamicStats.map((stat) => (
                  <TableCell key={stat.key}>
                    {cardStats?.[stat.key][Math.max(0, row.level - 1)] ?? 0}
                  </TableCell>
                ))}
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {row.abilities.map((ability) => (
                      <Tooltip key={`${row.level}-${ability}`} title={ability}>
                        <Box sx={{ display: "inline-flex" }}>
                          <Image
                            src={abilityIconUrl(ability)}
                            alt={ability}
                            width={22}
                            height={22}
                            style={{ borderRadius: 4 }}
                          />
                        </Box>
                      </Tooltip>
                    ))}
                    {row.abilities.length === 0 && <Typography variant="caption">-</Typography>}
                  </Stack>
                </TableCell>
                <TableCell>{row.targetCc}</TableCell>
                <TableCell
                  sx={
                    row.level === accountHighestLevel && isHighestCcAtMaxLevel
                      ? { color: "success.main", fontWeight: 700 }
                      : undefined
                  }
                >
                  {row.level === accountHighestLevel ? accountHighestCc : accountTotalCc}
                </TableCell>
                <TableCell>{row.neededBcx}</TableCell>
                <TableCell>{row.usd > 0 ? row.usd.toFixed(3) : "-"}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!canBuy || row.planItems.length === 0 || !row.exact}
                    onClick={() => onAddToPurchasePlan(row.planItems)}
                  >
                    Add
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={
                      !canBuy ||
                      buyBusy ||
                      row.planItems.length === 0 ||
                      !row.exact ||
                      row.planItems.reduce((sum, item) => sum + item.priceCredits, 0) >
                        balance.CREDITS
                    }
                    onClick={() => onRunCheckoutForPlan(row.planItems, "CREDITS")}
                  >
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Image src={credits_icon_url} alt="Credits" width={14} height={14} />
                      <Typography variant="caption">{row.credits.toFixed(0)}</Typography>
                    </Stack>
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={
                      !canBuy ||
                      buyBusy ||
                      row.planItems.length === 0 ||
                      !row.exact ||
                      row.planItems.reduce((sum, item) => sum + item.priceDec, 0) > balance.DEC
                    }
                    onClick={() => onRunCheckoutForPlan(row.planItems, "DEC")}
                  >
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Image src={dec_icon_url} alt="DEC" width={14} height={14} />
                      <Typography variant="caption">{row.dec.toFixed(3)}</Typography>
                    </Stack>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollableTableContainer>
  );
}
