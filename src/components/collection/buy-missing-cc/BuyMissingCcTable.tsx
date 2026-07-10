"use client";

import CardTableIcon from "@/components/collection/buy-missing-cc/CardTableIcon";
import ScrollableTableContainer from "@/components/shared/ScrollableTableContainer";
import {
  calculateUpgradeCostEstimate,
  calculateUpgradeRequirements,
  getCardFirstPlayableLevel,
  getCardMaxCc,
  getCardMaxLevel,
  getCombineRatesForCard,
} from "@/lib/shared/buy-missing-cc";
import { getFoilLabel } from "@/lib/shared/card-utils";
import { getCardSetLabel, getEditionIconUrl, getEditionLabel } from "@/lib/shared/edition-utils";
import { getBracketLevelRange, LEAGUE_BRACKETS } from "@/lib/shared/league-brackets";
import { getRarityIconUrl } from "@/lib/shared/rarity-utils";
import type { League } from "@/types/buy-missing-cc";
import type { SplSettings } from "@/types/spl/season";
import {
  Box,
  Button,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useState } from "react";
import { MdCheckCircle, MdErrorOutline, MdLocalOffer, MdWarningAmber } from "react-icons/md";
import { TbCopyPlusFilled } from "react-icons/tb";
import type { BuyMissingCcSortField, DisplayRow, Row } from "./types";
import { bracketStatus, getShortFoilLabel, isMaxOnlyFoil } from "./utils";

const PAGE_SIZE_OPTIONS = [50, 100, 1000] as const;

interface BuyMissingCcTableProps {
  rows: DisplayRow[];
  settings: SplSettings | null;
  selectedBracket: League | "";
  sortBy: BuyMissingCcSortField;
  sortDir: "asc" | "desc";
  toggleSort: (field: BuyMissingCcSortField) => void;
  isLoading: boolean;
  onOpenBuyDialog: (row: Row) => void;
  /**
   * When true, the table grows to fill the available height of a flex-column
   * parent (scrolling internally) instead of capping at a fixed maxHeight, so
   * the page fits the viewport without a second scrollbar on the parent.
   */
  fillHeight?: boolean;
}

export default function BuyMissingCcTable({
  rows,
  settings,
  selectedBracket,
  sortBy,
  sortDir,
  toggleSort,
  isLoading,
  onOpenBuyDialog,
  fillHeight = false,
}: Readonly<BuyMissingCcTableProps>) {
  const sortedRows = [...rows].sort((a, b) => {
    const compare = (() => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "owned") return a.totalOwnedCc - b.totalOwnedCc;

      const ratesA = settings
        ? getCombineRatesForCard(settings, a.edition, a.foil, a.rarity, a.tier)
        : null;
      const ratesB = settings
        ? getCombineRatesForCard(settings, b.edition, b.foil, b.rarity, b.tier)
        : null;

      const maxLevelA = ratesA ? getCardMaxLevel(ratesA) : 1;
      const maxLevelB = ratesB ? getCardMaxLevel(ratesB) : 1;
      const firstLevelA = ratesA ? getCardFirstPlayableLevel(ratesA) : 1;
      const firstLevelB = ratesB ? getCardFirstPlayableLevel(ratesB) : 1;
      const nextLevelA = Math.min(Math.max(firstLevelA, (a.highestOwnedLevel || 0) + 1), maxLevelA);
      const nextLevelB = Math.min(Math.max(firstLevelB, (b.highestOwnedLevel || 0) + 1), maxLevelB);

      const reqA = ratesA
        ? calculateUpgradeRequirements(a.totalOwnedCc, nextLevelA, ratesA)
        : { missingCc: 0, targetCc: 0 };
      const reqB = ratesB
        ? calculateUpgradeRequirements(b.totalOwnedCc, nextLevelB, ratesB)
        : { missingCc: 0, targetCc: 0 };

      const priceA = a.lowPricePerBcxUsd ?? Number.MAX_SAFE_INTEGER;
      const priceB = b.lowPricePerBcxUsd ?? Number.MAX_SAFE_INTEGER;
      const costA = reqA.missingCc * priceA;
      const costB = reqB.missingCc * priceB;

      if (sortBy === "next") return costA - costB;
      if (sortBy === "bracket") {
        if (!selectedBracket || !ratesA || !ratesB) return 0;
        const [, bracketMaxA] = getBracketLevelRange(selectedBracket, a.rarity);
        const [, bracketMaxB] = getBracketLevelRange(selectedBracket, b.rarity);
        const targetA = Math.min(bracketMaxA, maxLevelA);
        const targetB = Math.min(bracketMaxB, maxLevelB);
        const bracketReqA = calculateUpgradeRequirements(a.totalOwnedCc, targetA, ratesA);
        const bracketReqB = calculateUpgradeRequirements(b.totalOwnedCc, targetB, ratesB);
        const bracketCostA = bracketReqA.missingCc * priceA;
        const bracketCostB = bracketReqB.missingCc * priceB;
        return bracketCostA - bracketCostB;
      }

      const reqMaxA = ratesA
        ? calculateUpgradeRequirements(a.totalOwnedCc, maxLevelA, ratesA)
        : { missingCc: 0, targetCc: 0 };
      const reqMaxB = ratesB
        ? calculateUpgradeRequirements(b.totalOwnedCc, maxLevelB, ratesB)
        : { missingCc: 0, targetCc: 0 };
      const maxCostA = reqMaxA.missingCc * priceA;
      const maxCostB = reqMaxB.missingCc * priceB;
      return maxCostA - maxCostB;
    })();

    return sortDir === "asc" ? compare : -compare;
  });

  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = sortedRows.slice(
    (currentPage - 1) * pageSize,
    (currentPage - 1) * pageSize + pageSize
  );

  return (
    <>
      <ScrollableTableContainer
        maxHeight={fillHeight ? { xs: "70vh", md: "none" } : "70vh"}
        sx={{
          maxWidth: "100%",
          ...(fillHeight && { flex: { md: 1 }, minHeight: { md: 0 } }),
        }}
      >
        <Table
          size="small"
          stickyHeader
          sx={{
            "& .MuiTableCell-root": {
              px: 0.75,
              py: 0.6,
              whiteSpace: "nowrap",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 70, maxWidth: 70, px: 0.5 }}>Card</TableCell>
              <TableCell align="center">Buy</TableCell>
              <TableCell align="center">Comb</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "name"}
                  direction={sortBy === "name" ? sortDir : "asc"}
                  onClick={() => toggleSort("name")}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <Tooltip title="Rarity">
                  <span>R</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="Edition and set">
                  <span>E</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="Foil">
                  <span>F</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="Highest owned level">
                  <span>Hi Lv</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="CC in highest level copy">
                  <span>Hi CC</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "owned"}
                  direction={sortBy === "owned" ? sortDir : "asc"}
                  onClick={() => toggleSort("owned")}
                >
                  Tot CC
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <Tooltip title="Bracket status">
                  <span>B</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="Price per CC (USD)">
                  <span>$/CC</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === "next"}
                  direction={sortBy === "next" ? sortDir : "asc"}
                  onClick={() => toggleSort("next")}
                >
                  Next $
                </TableSortLabel>
              </TableCell>
              {selectedBracket && (
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "bracket"}
                    direction={sortBy === "bracket" ? sortDir : "asc"}
                    onClick={() => toggleSort("bracket")}
                  >
                    Bracket $
                  </TableSortLabel>
                </TableCell>
              )}
              <TableCell>
                <TableSortLabel
                  active={sortBy === "max"}
                  direction={sortBy === "max" ? sortDir : "asc"}
                  onClick={() => toggleSort("max")}
                >
                  Max $
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row) => {
              const rarityIcon = getRarityIconUrl(row.rarity);
              const editionIcon = getEditionIconUrl(row.edition);
              const maxOnlyFoil = isMaxOnlyFoil(row.foil);

              const rates = settings
                ? getCombineRatesForCard(settings, row.edition, row.foil, row.rarity, row.tier)
                : null;
              const maxLevel = rates ? getCardMaxLevel(rates) : 1;
              const maxLevelCc = rates ? getCardMaxCc(rates) : 1;
              const firstLevel = rates ? getCardFirstPlayableLevel(rates) : 1;
              const nextTarget = maxOnlyFoil
                ? maxLevel
                : Math.min(Math.max(firstLevel, row.highestOwnedLevel + 1), maxLevel);

              const nextReq = rates
                ? calculateUpgradeRequirements(row.totalOwnedCc, nextTarget, rates)
                : { targetCc: 0, missingCc: 0 };
              const nextEst = calculateUpgradeCostEstimate(
                nextReq.missingCc,
                row.lowPricePerBcxUsd
              );

              const maxReq = rates
                ? calculateUpgradeRequirements(row.totalOwnedCc, maxLevel, rates)
                : { targetCc: 0, missingCc: 0 };
              const maxEst = calculateUpgradeCostEstimate(maxReq.missingCc, row.lowPricePerBcxUsd);

              const bracketEst = (() => {
                if (!selectedBracket || !rates) return null;
                const [, bracketMax] = getBracketLevelRange(selectedBracket, row.rarity);
                const target = Math.min(bracketMax, maxLevel);
                const req = calculateUpgradeRequirements(row.totalOwnedCc, target, rates);
                return calculateUpgradeCostEstimate(req.missingCc, row.lowPricePerBcxUsd);
              })();

              const isHighestCcAtMaxLevel =
                row.highestOwnedCc > 0 && row.highestOwnedCc >= maxLevelCc;
              const isLevelOnMax = row.highestOwnedLevel > 0 && row.highestOwnedLevel >= maxLevel;

              const status =
                selectedBracket && rates
                  ? bracketStatus(row.highestOwnedLevel, selectedBracket, row.rarity)
                  : null;
              const bracketLabel = selectedBracket ? LEAGUE_BRACKETS[selectedBracket].label : "";

              return (
                <TableRow key={row.key} hover>
                  <TableCell
                    sx={{ minWidth: 70, maxWidth: 70, px: 0.5 }}
                    onClick={settings ? () => onOpenBuyDialog(row) : undefined}
                  >
                    <CardTableIcon
                      name={row.name}
                      edition={row.edition}
                      foil={row.foil}
                      level={row.highestOwnedLevel}
                      ownedCc={row.totalOwnedCc}
                    />
                  </TableCell>
                  <TableCell
                    align="center"
                    onClick={settings ? () => onOpenBuyDialog(row) : undefined}
                  >
                    <Tooltip
                      title={maxOnlyFoil ? "This foil supports max-level purchases only" : "Buy CC"}
                    >
                      <span>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={!settings}
                          sx={{ minWidth: 30, p: 0.5 }}
                        >
                          <MdLocalOffer size={15} />
                        </Button>
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Coming in a future release.">
                      <span>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled
                          sx={{ minWidth: 30, px: 0.5 }}
                        >
                          <TbCopyPlusFilled size={15} />
                        </Button>
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    {rarityIcon ? (
                      <Image src={rarityIcon} alt="rarity" width={16} height={16} />
                    ) : (
                      row.rarity
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      title={`Set: ${getCardSetLabel(row.edition, row.tier) ?? row.tier} | Edition: ${getEditionLabel(row.edition) ?? `Edition ${row.edition}`}`}
                    >
                      {editionIcon ? (
                        <Image src={editionIcon} alt="edition" width={16} height={16} />
                      ) : (
                        <span>{row.edition}</span>
                      )}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={getFoilLabel(row.foil)}>
                      <span>{getShortFoilLabel(row.foil)}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell
                    sx={isLevelOnMax ? { color: "success.main", fontWeight: 700 } : undefined}
                  >
                    {row.highestOwnedLevel > 0 ? row.highestOwnedLevel : "-"}
                  </TableCell>
                  <TableCell
                    sx={
                      isHighestCcAtMaxLevel ? { color: "success.main", fontWeight: 700 } : undefined
                    }
                  >
                    {row.highestOwnedCc}
                  </TableCell>
                  <TableCell>{row.totalOwnedCc}</TableCell>
                  <TableCell>
                    {!status ? null : status === "max" ? (
                      <Tooltip title={`Max for ${bracketLabel}`}>
                        <Box sx={{ display: "inline-flex", color: "success.main" }}>
                          <MdCheckCircle size={16} />
                        </Box>
                      </Tooltip>
                    ) : status === "in-bracket" ? (
                      <Tooltip title={`Playable in ${bracketLabel}, but not maxed.`}>
                        <Box sx={{ display: "inline-flex", color: "warning.main" }}>
                          <MdWarningAmber size={16} />
                        </Box>
                      </Tooltip>
                    ) : (
                      <Tooltip title={`Does not meet ${bracketLabel} requirements.`}>
                        <Box sx={{ display: "inline-flex", color: "error.main" }}>
                          <MdErrorOutline size={16} />
                        </Box>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.lowPricePerBcxUsd ? row.lowPricePerBcxUsd.toFixed(2) : "-"}
                  </TableCell>
                  <TableCell>{nextEst.usd > 0 ? nextEst.usd.toFixed(2) : "-"}</TableCell>
                  {selectedBracket && (
                    <TableCell>{bracketEst ? bracketEst.usd.toFixed(2) : "-"}</TableCell>
                  )}
                  <TableCell>{maxEst.usd > 0 ? maxEst.usd.toFixed(2) : "-"}</TableCell>
                </TableRow>
              );
            })}

            {!isLoading && pagedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={selectedBracket ? 15 : 14}>
                  No cards found for current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollableTableContainer>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 1, flexShrink: 0 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2">Rows</Typography>
          <Select
            size="small"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
              setPage(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
          <Typography variant="body2">{sortedRows.length} cards</Typography>
        </Stack>
        <Pagination page={currentPage} count={pageCount} onChange={(_e, value) => setPage(value)} />
      </Stack>
    </>
  );
}
