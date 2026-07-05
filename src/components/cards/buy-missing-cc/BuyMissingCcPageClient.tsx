"use client";

import BuyCardDialog from "@/components/cards/buy-card-dialog/BuyCardDialog";
import BuyMissingCcFilterDrawer from "@/components/cards/buy-missing-cc/BuyMissingCcFilterDrawer";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import ScrollableTableContainer from "@/components/shared/ScrollableTableContainer";
import { useAccountSelectorState } from "@/hooks/useAccountSelectorState";
import { useBuyMissingCcSharedData } from "@/hooks/cards/useBuyMissingCcSharedData";
import { getBuyMissingCcAccountDataAction } from "@/lib/backend/actions/buy-missing-cc-actions";
import { useAuth } from "@/lib/frontend/context/AuthContext";
import { useBuyMissingCcFilter } from "@/lib/frontend/context/BuyMissingCcFilterContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import {
  calculateUpgradeCostEstimate,
  calculateUpgradeRequirements,
  getCardMaxLevel,
  getCombineRatesForCard,
} from "@/lib/shared/buy-missing-cc";
import { matchesCardFilter } from "@/lib/shared/card-filter-utils";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { getFoilLabel, toCardFoil } from "@/lib/shared/card-utils";
import { getEditionIconUrl, getSetIconUrl, getSetName } from "@/lib/shared/edition-utils";
import {
  getBracketLevelRange,
  LEAGUE_BRACKETS,
  rarityNameById,
} from "@/lib/shared/league-brackets";
import { getRarityIconUrl } from "@/lib/shared/rarity-utils";
import type { LeagueBracket } from "@/types/buy-missing-cc";
import type { CardFoil } from "@/types/card";
import {
  Alert,
  Box,
  Button,
  Chip,
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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { MdCheckCircle, MdErrorOutline, MdLocalOffer, MdWarningAmber } from "react-icons/md";
import { TbCopyPlusFilled } from "react-icons/tb";
import BracketFilter from "./BracketFilter";

type BracketTableState = "all" | "below" | "in-bracket" | "max";

type AccountCardState = {
  highestLevel: number;
  highestCc: number;
  totalCc: number;
};

type Row = {
  key: string;
  cardDetailId: number;
  name: string;
  rarity: number;
  color: string;
  secondaryColor?: string;
  type: string;
  tier?: number;
  edition: number;
  foil: number;
  availableFoils: CardFoil[];
  accountStates: Record<string, AccountCardState>;
  lowPricePerBcxUsd: number | null;
  stats: {
    mana: number[];
    attack: number[];
    ranged: number[];
    magic: number[];
    armor: number[];
    health: number[];
    speed: number[];
    abilities: string[][];
  };
};

type DisplayRow = Row & {
  highestOwnedLevel: number;
  highestOwnedCc: number;
  totalOwnedCc: number;
};

const PAGE_SIZE_OPTIONS = [50, 100, 1000] as const;
const LS_KEY = "buy-missing-cc-selection-v4";

function isMaxOnlyFoil(foil: number): boolean {
  return foil === 2 || foil === 3 || foil === 4;
}

function bracketStatus(level: number, bracket: LeagueBracket, rarity: number) {
  const [min, max] = getBracketLevelRange(bracket, rarity);
  if (level >= max) return "max" as const;
  if (level >= min) return "in-bracket" as const;
  return "below-bracket" as const;
}

export default function BuyMissingCcPageClient() {
  const { addItems } = usePurchasePlan();
  const { filter } = useBuyMissingCcFilter();
  const { user } = useAuth();
  const {
    cardDetails,
    settings,
    loading: sharedLoading,
    error: sharedError,
  } = useBuyMissingCcSharedData();

  const {
    monitoredAccounts,
    selectedAccount,
    setSelectedAccount,
    addAccountInput,
    setAddAccountInput,
    accountOptions,
    addLocalAccount,
    removeLocalAccount,
  } = useAccountSelectorState({
    storageKey: LS_KEY,
    loggedInUsername: user?.username,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(50);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"name" | "owned" | "next" | "bracket" | "max">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [selectedBracket, setSelectedBracket] = useState<LeagueBracket | "">("");
  const [bracketStateFilter, setBracketStateFilter] = useState<BracketTableState>("all");
  const [search, setSearch] = useState("");

  const [dialogRow, setDialogRow] = useState<Row | null>(null);

  const canBuy = selectedAccount.trim().length > 0;

  useEffect(() => {
    let active = true;

    async function load() {
      if (!selectedAccount) {
        setRows([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (sharedLoading) {
          return;
        }

        if (sharedError) {
          setError(sharedError);
          return;
        }

        if (!settings || cardDetails.length === 0) {
          return;
        }

        const snapshot = await getBuyMissingCcAccountDataAction(selectedAccount);
        if (!active) return;

        const byKey: Record<string, AccountCardState> = {};
        for (const card of snapshot.collection.cards) {
          const key = `${card.card_detail_id}-${card.edition}-${card.foil}`;
          const current = byKey[key] ?? { highestLevel: 0, highestCc: 0, totalCc: 0 };
          const level = card.level ?? 0;
          if (level > current.highestLevel) {
            current.highestLevel = level;
            current.highestCc = card.bcx ?? 0;
          } else if (level === current.highestLevel) {
            current.highestCc = Math.max(current.highestCc, card.bcx ?? 0);
          }
          current.totalCc += card.bcx ?? 0;
          byKey[key] = current;
        }

        const groupedPriceByKey = new Map<string, number>();
        for (const market of snapshot.groupedMarket) {
          const foil = market.foil ?? (market.gold ? 1 : 0);
          const key = `${market.card_detail_id}-${foil}`;
          const existing = groupedPriceByKey.get(key);
          const nextPrice = Number(market.low_price_bcx);
          if (Number.isFinite(nextPrice) && nextPrice > 0) {
            groupedPriceByKey.set(key, existing ? Math.min(existing, nextPrice) : nextPrice);
          }
        }

        const nextRows: Row[] = [];
        for (const detail of cardDetails) {
          const available = (detail.distribution ?? []).filter((entry) => entry.edition !== 16);
          const variants = new Set(available.map((entry) => `${entry.edition}-${entry.foil}`));

          for (const variant of variants) {
            const [editionRaw, foilRaw] = variant.split("-");
            const edition = Number(editionRaw);
            const foil = Number(foilRaw);
            if (edition === 16) continue; // skip foundation soulbound edition

            const key = `${detail.id}-${edition}-${foil}`;
            const priceKey = `${detail.id}-${foil}`;
            const foilsForEdition = Array.from(
              new Set(
                available
                  .filter((entry) => entry.edition === edition)
                  .map((entry) => toCardFoil(entry.foil ?? 0))
              )
            );

            const accountStates: Record<string, AccountCardState> = {
              [selectedAccount]: byKey[key] ?? {
                highestLevel: 0,
                highestCc: 0,
                totalCc: 0,
              },
            };

            nextRows.push({
              key,
              cardDetailId: detail.id,
              name: detail.name,
              rarity: detail.rarity,
              color: detail.color,
              secondaryColor: detail.secondary_color ?? undefined,
              type: detail.type,
              tier: detail.tier ?? undefined,
              edition,
              foil,
              availableFoils: foilsForEdition.length > 0 ? foilsForEdition : ["regular"],
              accountStates,
              lowPricePerBcxUsd: groupedPriceByKey.get(priceKey) ?? null,
              stats: detail.stats,
            });
          }
        }

        setRows(nextRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Buy Missing CC data");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [cardDetails, selectedAccount, settings, sharedError, sharedLoading]);

  const isLoading = loading || sharedLoading;

  const displayRows = useMemo<DisplayRow[]>(() => {
    return rows.map((row) => {
      const state = (selectedAccount && row.accountStates[selectedAccount]) || {
        highestLevel: 0,
        highestCc: 0,
        totalCc: 0,
      };

      return {
        ...row,
        highestOwnedLevel: state.highestLevel,
        highestOwnedCc: state.highestCc,
        totalOwnedCc: state.totalCc,
      };
    });
  }, [rows, selectedAccount]);

  const filteredRows = useMemo(() => {
    return displayRows
      .filter((row) => {
        const pseudo = {
          cardDetailId: row.cardDetailId,
          name: row.name,
          edition: row.edition,
          tier: row.tier,
          rarity: rarityNameById(row.rarity),
          color: (row.color ?? "gray").toLowerCase(),
          secondaryColor: row.secondaryColor?.toLowerCase(),
          role: row.type === "Summoner" ? "archon" : "unit",
          availableFoils: row.availableFoils,
        };
        if (!matchesCardFilter(pseudo as never, filter)) return false;
        if (
          filter.foilCategories.length > 0 &&
          !filter.foilCategories.includes(toCardFoil(row.foil))
        ) {
          return false;
        }
        if (search && !row.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (!selectedBracket) return true;

        const status = bracketStatus(row.highestOwnedLevel, selectedBracket, row.rarity);
        if (bracketStateFilter === "below") return status === "below-bracket";
        if (bracketStateFilter === "in-bracket") return status === "in-bracket";
        if (bracketStateFilter === "max") return status === "max";
        return true;
      })
      .sort((a, b) => {
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
          const nextLevelA = Math.min((a.highestOwnedLevel || 0) + 1, maxLevelA);
          const nextLevelB = Math.min((b.highestOwnedLevel || 0) + 1, maxLevelB);

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
            if (!selectedBracket) return 0;
            const bracketA = bracketStatus(a.highestOwnedLevel, selectedBracket, a.rarity);
            const bracketB = bracketStatus(b.highestOwnedLevel, selectedBracket, b.rarity);
            return bracketA.localeCompare(bracketB);
          }

          const maxA = ratesA ? getCardMaxLevel(ratesA) : 1;
          const maxB = ratesB ? getCardMaxLevel(ratesB) : 1;
          const reqMaxA = ratesA
            ? calculateUpgradeRequirements(a.totalOwnedCc, maxA, ratesA)
            : { missingCc: 0, targetCc: 0 };
          const reqMaxB = ratesB
            ? calculateUpgradeRequirements(b.totalOwnedCc, maxB, ratesB)
            : { missingCc: 0, targetCc: 0 };
          const maxPriceA = a.lowPricePerBcxUsd ?? Number.MAX_SAFE_INTEGER;
          const maxPriceB = b.lowPricePerBcxUsd ?? Number.MAX_SAFE_INTEGER;
          const maxCostA = reqMaxA.missingCc * maxPriceA;
          const maxCostB = reqMaxB.missingCc * maxPriceB;
          return maxCostA - maxCostB;
        })();

        return sortDir === "asc" ? compare : -compare;
      });
  }, [displayRows, filter, search, selectedBracket, bracketStateFilter, sortBy, sortDir, settings]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const summary = useMemo(() => {
    let toMaxUsd = 0;
    let toBracketUsd = 0;

    for (const row of filteredRows) {
      if (!settings) continue;
      const rates = getCombineRatesForCard(settings, row.edition, row.foil, row.rarity, row.tier);
      if (!rates) continue;

      const maxLevel = getCardMaxLevel(rates);
      const maxReq = calculateUpgradeRequirements(row.totalOwnedCc, maxLevel, rates);
      const maxCost = calculateUpgradeCostEstimate(maxReq.missingCc, row.lowPricePerBcxUsd);
      toMaxUsd += maxCost.usd;

      if (selectedBracket) {
        const [, bracketMax] = getBracketLevelRange(selectedBracket, row.rarity);
        const targetLevel = Math.min(bracketMax, maxLevel);
        const bracketReq = calculateUpgradeRequirements(row.totalOwnedCc, targetLevel, rates);
        const bracketCost = calculateUpgradeCostEstimate(
          bracketReq.missingCc,
          row.lowPricePerBcxUsd
        );
        toBracketUsd += bracketCost.usd;
      }
    }

    return { toMaxUsd, toBracketUsd };
  }, [filteredRows, selectedBracket, settings]);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDir("asc");
  }

  return (
    <Box display="flex" gap={2}>
      <Box flex={1}>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Typography variant="h4">Buy Missing CC</Typography>

          <AccountSelectorBar
            accounts={accountOptions}
            selectedAccount={selectedAccount}
            onSelectedAccountChange={setSelectedAccount}
            addAccountInput={addAccountInput}
            onAddAccountInputChange={setAddAccountInput}
            onAddAccount={addLocalAccount}
            onRemoveSelected={() => removeLocalAccount(selectedAccount)}
            removeDisabled={!selectedAccount || monitoredAccounts.includes(selectedAccount)}
            extraContent={
              <TextField
                size="small"
                label="Search card"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: 220 }}
              />
            }
          />

          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <BracketFilter
              selectedBracket={selectedBracket}
              setSelectedBracket={setSelectedBracket}
            />

            {selectedBracket && (
              <ToggleButtonGroup
                exclusive
                value={bracketStateFilter}
                onChange={(_event, value) => {
                  if (!value) return;
                  setBracketStateFilter(value);
                }}
                size="small"
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="below">Below Bracket</ToggleButton>
                <ToggleButton value="in-bracket">In Bracket</ToggleButton>
                <ToggleButton value="max">Max for Bracket</ToggleButton>
              </ToggleButtonGroup>
            )}
          </Stack>

          {!canBuy && <Alert severity="info">Select an account to enable purchasing.</Alert>}

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <Chip label={`Estimated Max (USD): ${summary.toMaxUsd.toFixed(3)}`} />
            {selectedBracket && (
              <Chip
                color="primary"
                label={`Estimated ${LEAGUE_BRACKETS[selectedBracket].label} (USD): ${summary.toBracketUsd.toFixed(3)}`}
              />
            )}
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Estimate formula: (Required CC - Current CC) x Lowest Price/BCX.
          </Typography>
        </Stack>

        <ScrollableTableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Card</TableCell>
                <TableCell>Buy CC</TableCell>
                <TableCell>
                  <Tooltip title="Combine (coming soon)">
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                      <TbCopyPlusFilled size={16} /> Combine
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "name"}
                    direction={sortBy === "name" ? sortDir : "asc"}
                    onClick={() => toggleSort("name")}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Rarity</TableCell>
                <TableCell>Set</TableCell>
                <TableCell>Edition</TableCell>
                <TableCell>Foil</TableCell>
                <TableCell>Highest Level</TableCell>
                <TableCell>CC in Highest</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "owned"}
                    direction={sortBy === "owned" ? sortDir : "asc"}
                    onClick={() => toggleSort("owned")}
                  >
                    Total CC
                  </TableSortLabel>
                </TableCell>
                <TableCell>Bracket Status</TableCell>
                <TableCell>Lowest Price/BCX</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "next"}
                    direction={sortBy === "next" ? sortDir : "asc"}
                    onClick={() => toggleSort("next")}
                  >
                    Estimated Next ($)
                  </TableSortLabel>
                </TableCell>
                {selectedBracket && (
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === "bracket"}
                      direction={sortBy === "bracket" ? sortDir : "asc"}
                      onClick={() => toggleSort("bracket")}
                    >
                      Estimated Bracket ($)
                    </TableSortLabel>
                  </TableCell>
                )}
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "max"}
                    direction={sortBy === "max" ? sortDir : "asc"}
                    onClick={() => toggleSort("max")}
                  >
                    Estimated Max ($)
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRows.map((row) => {
                const setName = getSetName(row.edition);
                const setIcon = setName ? getSetIconUrl(setName) : undefined;
                const editionIcon = getEditionIconUrl(row.edition);
                const rarityIcon = getRarityIconUrl(rarityNameById(row.rarity));
                const maxOnlyFoil = isMaxOnlyFoil(row.foil);

                const rates = settings
                  ? getCombineRatesForCard(settings, row.edition, row.foil, row.rarity, row.tier)
                  : null;
                const maxLevelCC = rates ? getCardMaxLevel(rates) : 1;
                const maxLevel = rates?.length ?? 1;
                const nextTarget = maxOnlyFoil
                  ? maxLevelCC
                  : Math.min(Math.max(1, row.highestOwnedLevel + 1), maxLevelCC);

                const nextReq = rates
                  ? calculateUpgradeRequirements(row.totalOwnedCc, nextTarget, rates)
                  : { targetCc: 0, missingCc: 0 };
                const nextEst = calculateUpgradeCostEstimate(
                  nextReq.missingCc,
                  row.lowPricePerBcxUsd
                );

                const maxReq = rates
                  ? calculateUpgradeRequirements(row.totalOwnedCc, maxLevelCC, rates)
                  : { targetCc: 0, missingCc: 0 };
                const maxEst = calculateUpgradeCostEstimate(
                  maxReq.missingCc,
                  row.lowPricePerBcxUsd
                );

                const bracketEst = (() => {
                  if (!selectedBracket || !rates) return null;
                  const [, bracketMax] = getBracketLevelRange(selectedBracket, row.rarity);
                  const target = Math.min(bracketMax, maxLevelCC);
                  const req = calculateUpgradeRequirements(row.totalOwnedCc, target, rates);
                  return calculateUpgradeCostEstimate(req.missingCc, row.lowPricePerBcxUsd);
                })();

                const isHighestCcAtMaxLevel =
                  row.highestOwnedCc > 0 && row.highestOwnedCc >= maxLevelCC ? true : false;

                const isLevelOnMax =
                  row.highestOwnedLevel > 0 && row.highestOwnedLevel >= maxLevel ? true : false;

                const status =
                  selectedBracket && rates
                    ? bracketStatus(row.highestOwnedLevel, selectedBracket, row.rarity)
                    : null;
                const bracketLabel = selectedBracket ? LEAGUE_BRACKETS[selectedBracket].label : "";

                const tileSrc = getCardImageByLevel(
                  row.name,
                  row.edition,
                  toCardFoil(row.foil),
                  Math.max(1, row.highestOwnedLevel)
                );

                return (
                  <TableRow key={row.key}>
                    <TableCell>
                      <Tooltip
                        title={
                          <Image
                            src={tileSrc}
                            alt={row.name}
                            width={180}
                            height={252}
                            style={{ objectFit: "contain" }}
                          />
                        }
                        placement="right"
                      >
                        <Box>
                          <Image
                            src={tileSrc}
                            alt={row.name}
                            width={50}
                            height={50}
                            style={{
                              objectFit: "cover",
                              borderRadius: 6,
                              opacity: row.totalOwnedCc > 0 ? 1 : 0.4,
                              filter: row.totalOwnedCc > 0 ? "none" : "grayscale(60%)",
                            }}
                          />
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={
                          !canBuy
                            ? "Select an account first"
                            : maxOnlyFoil
                              ? "This foil supports max-level purchases only"
                              : "Buy CC"
                        }
                      >
                        <span>
                          <Button
                            variant="outlined"
                            size="small"
                            disabled={!canBuy || !settings || !selectedAccount}
                            onClick={() => setDialogRow(row)}
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.75,
                              px: 1,
                              textTransform: "none",
                            }}
                          >
                            <MdLocalOffer size={16} />
                          </Button>
                        </span>
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      <Tooltip title="Coming in a future release.">
                        <span>
                          <Button variant="outlined" size="small" disabled>
                            <TbCopyPlusFilled size={14} />
                          </Button>
                        </span>
                      </Tooltip>
                    </TableCell>

                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      {rarityIcon ? (
                        <Image src={rarityIcon} alt="rarity" width={18} height={18} />
                      ) : (
                        row.rarity
                      )}
                    </TableCell>
                    <TableCell>
                      {setIcon ? <Image src={setIcon} alt="set" width={18} height={18} /> : "-"}
                    </TableCell>
                    <TableCell>
                      {editionIcon ? (
                        <Image src={editionIcon} alt="edition" width={18} height={18} />
                      ) : (
                        row.edition
                      )}
                    </TableCell>
                    <TableCell>{getFoilLabel(row.foil)}</TableCell>
                    <TableCell
                      sx={isLevelOnMax ? { color: "success.main", fontWeight: 700 } : undefined}
                    >
                      {row.highestOwnedLevel > 0 ? row.highestOwnedLevel : "Not owned"}
                    </TableCell>
                    <TableCell
                      sx={
                        isHighestCcAtMaxLevel
                          ? { color: "success.main", fontWeight: 700 }
                          : undefined
                      }
                    >
                      {row.highestOwnedCc}
                    </TableCell>
                    <TableCell>{row.totalOwnedCc}</TableCell>
                    <TableCell>
                      {!status ? null : status === "max" ? (
                        <Tooltip title={`Max for ${bracketLabel}`}>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              color: "success.main",
                            }}
                          >
                            <MdCheckCircle /> Max
                          </Box>
                        </Tooltip>
                      ) : status === "in-bracket" ? (
                        <Tooltip title={`Playable in ${bracketLabel}, but not maxed.`}>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              color: "warning.main",
                            }}
                          >
                            <MdWarningAmber /> Playable
                          </Box>
                        </Tooltip>
                      ) : (
                        <Tooltip title={`Does not meet ${bracketLabel} requirements.`}>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              color: "error.main",
                            }}
                          >
                            <MdErrorOutline /> Below
                          </Box>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.lowPricePerBcxUsd ? row.lowPricePerBcxUsd.toFixed(6) : "-"}
                    </TableCell>
                    <TableCell>{nextEst.usd > 0 ? nextEst.usd.toFixed(3) : "-"}</TableCell>
                    {selectedBracket && (
                      <TableCell>{bracketEst ? bracketEst.usd.toFixed(3) : "-"}</TableCell>
                    )}
                    <TableCell>{maxEst.usd > 0 ? maxEst.usd.toFixed(3) : "-"}</TableCell>
                  </TableRow>
                );
              })}

              {!isLoading && pagedRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={selectedBracket ? 16 : 15}>
                    No cards found for current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollableTableContainer>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
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
            <Typography variant="body2">{filteredRows.length} cards</Typography>
          </Stack>
          <Pagination page={page} count={pageCount} onChange={(_e, value) => setPage(value)} />
        </Stack>
      </Box>

      <BuyMissingCcFilterDrawer />

      {dialogRow && settings && (
        <BuyCardDialog
          open={Boolean(dialogRow)}
          mode="target-level"
          account={selectedAccount}
          cardDetailId={dialogRow.cardDetailId}
          cardName={dialogRow.name}
          edition={dialogRow.edition}
          foil={dialogRow.foil}
          cardRarity={dialogRow.rarity}
          cardTier={dialogRow.tier}
          cardStats={dialogRow.stats}
          settings={settings}
          initialTargetBracket={selectedBracket || undefined}
          canBuy={canBuy}
          selectableAccounts={accountOptions}
          onClose={() => setDialogRow(null)}
          onAddToPurchasePlan={(items) => {
            addItems(items);
            setDialogRow(null);
          }}
        />
      )}
    </Box>
  );
}
