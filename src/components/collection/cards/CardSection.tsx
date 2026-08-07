"use client";

import BuyCardDialog from "@/components/collection/buy-card-dialog/BuyCardDialog";
import CardTableIcon from "@/components/collection/buy-missing-cc/CardTableIcon";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import { useMarketplaceView } from "@/lib/frontend/context/MarketplaceViewContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { matchesCardFilter } from "@/lib/shared/card-filter-utils";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { getFoilLabel, toCardFoilInt } from "@/lib/shared/card-utils";
import { getEditionIconUrl, getEditionLabel } from "@/lib/shared/edition-utils";
import { getRarityIconUrl, getRarityId } from "@/lib/shared/rarity-utils";
import {
  CardFoil,
  type DetailedPlayerCardCollection,
  DetailedPlayerCardCollectionItem,
} from "@/types/card";
import {
  Alert,
  Box,
  Button,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { MdLocalOffer } from "react-icons/md";
import { Card } from "./Card";

interface CardSectionProps {
  username: string;
  playerCards: DetailedPlayerCardCollection;
  selectableAccounts?: string[];
  showPrices?: boolean;
  marketPrices?: Record<string, { qty: number; lowPriceBcx: number; lowPrice: number }>;
}

type DialogCard = DetailedPlayerCardCollectionItem & {
  foil: CardFoil;
  currentCc: number;
};

type SortField =
  | "default"
  | "name"
  | "rarity"
  | "edition"
  | "foil"
  | "hiLv"
  | "hiCc"
  | "totCc"
  | "priceCc"
  | "oneCc"
  | "listed";

type DisplayItem = {
  key: string;
  sourceOrder: number;
  cardItem: DetailedPlayerCardCollectionItem;
  foil: CardFoil;
  highestLevel: number;
  highestCc: number;
  totalCc: number;
  isMissing: boolean;
  imageUrl: string;
  groupCards: NonNullable<DetailedPlayerCardCollectionItem["allCards"]>;
  priceInfo: { qty: number; lowPriceBcx: number; lowPrice: number } | undefined;
};

const GRID_BATCH_SIZE = 40;

function shortFoil(foil: CardFoil): string {
  if (foil === "regular") return "R";
  if (foil === "gold") return "G";
  if (foil === "gold arcane") return "GA";
  if (foil === "black") return "B";
  return "BA";
}

export const CardSection = ({
  username,
  playerCards,
  selectableAccounts,
  showPrices,
  marketPrices,
}: CardSectionProps) => {
  const { filter } = useCardFilter();
  const { addItems } = usePurchasePlan();
  const { viewMode } = useMarketplaceView();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [dialogCard, setDialogCard] = useState<DialogCard | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("default");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCount, setVisibleCount] = useState(GRID_BATCH_SIZE);
  const gridSentinelRef = useRef<HTMLDivElement | null>(null);

  const openBuyDialog = (card: DialogCard) => {
    setDialogCard(card);
    setDialogOpen(true);
  };

  const displayItems = useMemo<DisplayItem[]>(() => {
    const items: DisplayItem[] = [];
    let sourceOrder = 0;

    for (const cardItem of Object.values(playerCards)) {
      if (filter.hideMissingCards && cardItem.allCards?.length === 0) continue;
      if (!matchesCardFilter(cardItem, filter)) continue;
      if (cardItem.edition === 9 || cardItem.edition === 11 || cardItem.edition === 16) continue;

      const cardsByEditionAndFoil = (cardItem.allCards ?? []).reduce(
        (acc, card) => {
          const key = `${card.edition}-${card.foil}`;
          if (!acc[key]) {
            acc[key] = {
              edition: card.edition,
              foil: card.foil,
              count: 0,
              highestLevel: 0,
              highestCc: 0,
              totalCc: 0,
              cards: [],
            };
          }

          acc[key].count += 1;
          acc[key].highestLevel = Math.max(acc[key].highestLevel, card.level || 0);
          acc[key].totalCc += card.bcx || 0;
          acc[key].cards.push(card);
          return acc;
        },
        {} as Record<
          string,
          {
            edition: number;
            foil: CardFoil;
            count: number;
            highestLevel: number;
            highestCc: number;
            totalCc: number;
            cards: NonNullable<DetailedPlayerCardCollectionItem["allCards"]>;
          }
        >
      );

      for (const group of Object.values(cardsByEditionAndFoil)) {
        group.highestCc = group.cards
          .filter((c) => (c.level || 0) === group.highestLevel)
          .reduce((maxCc, c) => Math.max(maxCc, c.bcx || 0), 0);
      }

      const foilFilterActive = filter.foilCategories.length > 0;
      const filteredOwnedGroups = foilFilterActive
        ? Object.values(cardsByEditionAndFoil).filter((g) => filter.foilCategories.includes(g.foil))
        : Object.values(cardsByEditionAndFoil);

      if (filteredOwnedGroups.length > 0) {
        for (const group of filteredOwnedGroups) {
          items.push({
            key: `${cardItem.cardDetailId}-${group.edition}-${group.foil}`,
            sourceOrder: sourceOrder++,
            cardItem: { ...cardItem, allCards: group.cards },
            foil: group.foil,
            highestLevel: group.highestLevel,
            highestCc: group.highestCc,
            totalCc: group.totalCc,
            isMissing: false,
            imageUrl: getCardImageByLevel(
              cardItem.name,
              group.edition,
              group.foil,
              group.highestLevel
            ),
            groupCards: group.cards,
            priceInfo:
              showPrices && marketPrices
                ? marketPrices[`${cardItem.cardDetailId}-${toCardFoilInt(group.foil)}`]
                : undefined,
          });
        }
      }

      const includeMissing = !filter.hideMissingCards;
      if (!includeMissing) continue;

      // Missing-foil behavior:
      // - one foil selected => one missing row in that foil
      // - multiple foils selected => one missing row per selected foil
      // - no foil selected => regular foil
      const requestedFoils: CardFoil[] =
        filter.foilCategories.length > 0 ? filter.foilCategories : ["regular"];
      const missingFoils = requestedFoils.filter((foil) => cardItem.availableFoils.includes(foil));
      if (missingFoils.length === 0) continue;

      const ownedFoilSet = new Set(Object.values(cardsByEditionAndFoil).map((g) => g.foil));

      for (const foil of missingFoils) {
        if (ownedFoilSet.has(foil)) continue;

        items.push({
          key: `${cardItem.cardDetailId}-missing-${cardItem.edition}-${foil}`,
          sourceOrder: sourceOrder++,
          cardItem,
          foil,
          highestLevel: 0,
          highestCc: 0,
          totalCc: 0,
          isMissing: true,
          imageUrl: getCardImageByLevel(cardItem.name, cardItem.edition, foil),
          groupCards: [],
          priceInfo:
            showPrices && marketPrices
              ? marketPrices[`${cardItem.cardDetailId}-${toCardFoilInt(foil)}`]
              : undefined,
        });
      }
    }

    return items;
  }, [filter, playerCards, showPrices, marketPrices]);

  const sortedItems = useMemo(() => {
    const next = [...displayItems];
    next.sort((a, b) => {
      const compare = (() => {
        if (sortBy === "default") return a.sourceOrder - b.sourceOrder;
        if (sortBy === "name") return a.cardItem.name.localeCompare(b.cardItem.name);
        if (sortBy === "rarity") {
          return (getRarityId(a.cardItem.rarity) ?? 0) - (getRarityId(b.cardItem.rarity) ?? 0);
        }
        if (sortBy === "edition") return a.cardItem.edition - b.cardItem.edition;
        if (sortBy === "foil") return a.foil.localeCompare(b.foil);
        if (sortBy === "hiLv") return a.highestLevel - b.highestLevel;
        if (sortBy === "hiCc") return a.highestCc - b.highestCc;
        if (sortBy === "totCc") return a.totalCc - b.totalCc;
        if (sortBy === "priceCc")
          return (
            (a.priceInfo?.lowPriceBcx ?? Number.MAX_SAFE_INTEGER) -
            (b.priceInfo?.lowPriceBcx ?? Number.MAX_SAFE_INTEGER)
          );
        if (sortBy === "oneCc")
          return (
            (a.priceInfo?.lowPrice ?? Number.MAX_SAFE_INTEGER) -
            (b.priceInfo?.lowPrice ?? Number.MAX_SAFE_INTEGER)
          );
        return (a.priceInfo?.qty ?? 0) - (b.priceInfo?.qty ?? 0);
      })();
      return sortDir === "asc" ? compare : -compare;
    });
    return next;
  }, [displayItems, sortBy, sortDir]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(GRID_BATCH_SIZE);
  }, [sortedItems, viewMode]);

  useEffect(() => {
    if (viewMode !== "card") return;
    const sentinel = gridSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((current) => Math.min(current + GRID_BATCH_SIZE, sortedItems.length));
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sortedItems.length, viewMode]);

  const visibleGridItems = sortedItems.slice(0, visibleCount);

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDir("asc");
  }

  return (
    <Box display="flex" flex={1} flexDirection="column">
      <Typography variant="h6" color="text.secondary" gutterBottom>
        CARDS: ({sortedItems.length})
      </Typography>

      {viewMode === "table" ? (
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 70, maxWidth: 70, px: 0.5 }}>Card</TableCell>
                <TableCell align="center">Buy</TableCell>
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
                  <TableSortLabel
                    active={sortBy === "default"}
                    direction={sortBy === "default" ? sortDir : "asc"}
                    onClick={() => toggleSort("default")}
                  >
                    #
                  </TableSortLabel>
                </TableCell>

                <TableCell>
                  <TableSortLabel
                    active={sortBy === "rarity"}
                    direction={sortBy === "rarity" ? sortDir : "asc"}
                    onClick={() => toggleSort("rarity")}
                  >
                    <Tooltip title="Rarity">
                      <span>R</span>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "edition"}
                    direction={sortBy === "edition" ? sortDir : "asc"}
                    onClick={() => toggleSort("edition")}
                  >
                    <Tooltip title="Edition">
                      <span>E</span>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "foil"}
                    direction={sortBy === "foil" ? sortDir : "asc"}
                    onClick={() => toggleSort("foil")}
                  >
                    <Tooltip title="Foil">
                      <span>F</span>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "hiLv"}
                    direction={sortBy === "hiLv" ? sortDir : "asc"}
                    onClick={() => toggleSort("hiLv")}
                  >
                    <Tooltip title="Highest owned level">
                      <span>Hi Lv</span>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "hiCc"}
                    direction={sortBy === "hiCc" ? sortDir : "asc"}
                    onClick={() => toggleSort("hiCc")}
                  >
                    <Tooltip title="BCX in highest-level copy">
                      <span>Hi CC</span>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "totCc"}
                    direction={sortBy === "totCc" ? sortDir : "asc"}
                    onClick={() => toggleSort("totCc")}
                  >
                    <Tooltip title="Total owned BCX">
                      <span>Tot CC</span>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "priceCc"}
                    direction={sortBy === "priceCc" ? sortDir : "asc"}
                    onClick={() => toggleSort("priceCc")}
                  >
                    <Tooltip title="Lowest price per BCX">
                      <span>Price/CC</span>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "oneCc"}
                    direction={sortBy === "oneCc" ? sortDir : "asc"}
                    onClick={() => toggleSort("oneCc")}
                  >
                    <Tooltip title="Lowest 1 BCX price">
                      <span>1 CC</span>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === "listed"}
                    direction={sortBy === "listed" ? sortDir : "asc"}
                    onClick={() => toggleSort("listed")}
                  >
                    <Tooltip title="Number of listed cards">
                      <span>Listed</span>
                    </Tooltip>
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedItems.map((item) => {
                const rarityIcon = getRarityIconUrl(item.cardItem.rarity);
                const editionIcon = getEditionIconUrl(item.cardItem.edition);

                return (
                  <TableRow key={item.key} hover sx={{ opacity: item.isMissing ? 0.65 : 1 }}>
                    <TableCell sx={{ minWidth: 70, maxWidth: 70, px: 0.5 }}>
                      <CardTableIcon
                        name={item.cardItem.name}
                        edition={item.cardItem.edition}
                        foil={item.foil}
                        level={item.highestLevel}
                        ownedCc={item.totalCc}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Buy">
                        <span>
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ minWidth: 30, p: 0.5 }}
                            onClick={() =>
                              openBuyDialog({
                                ...item.cardItem,
                                foil: item.foil,
                                currentCc: item.totalCc,
                              })
                            }
                          >
                            <MdLocalOffer size={15} />
                          </Button>
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{item.cardItem.name}</TableCell>
                    <TableCell>{item.cardItem.cardDetailId}</TableCell>
                    <TableCell>
                      {rarityIcon ? (
                        <Image src={rarityIcon} alt="rarity" width={16} height={16} />
                      ) : (
                        item.cardItem.rarity
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={
                          getEditionLabel(item.cardItem.edition) ??
                          `Edition ${item.cardItem.edition}`
                        }
                      >
                        <span>
                          {editionIcon ? (
                            <Image src={editionIcon} alt="edition" width={16} height={16} />
                          ) : (
                            item.cardItem.edition
                          )}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={getFoilLabel(item.foil)}>
                        <span>{shortFoil(item.foil)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{item.highestLevel > 0 ? item.highestLevel : "-"}</TableCell>
                    <TableCell>{item.highestCc > 0 ? item.highestCc : "-"}</TableCell>
                    <TableCell>{item.totalCc > 0 ? item.totalCc : "-"}</TableCell>
                    <TableCell>
                      {item.priceInfo?.lowPriceBcx && item.priceInfo.lowPriceBcx > 0
                        ? `$${item.priceInfo.lowPriceBcx.toFixed(3)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.priceInfo?.lowPrice && item.priceInfo.lowPrice > 0
                        ? `$${item.priceInfo.lowPrice.toFixed(3)}`
                        : "-"}
                    </TableCell>
                    <TableCell>{item.priceInfo?.qty ?? "-"}</TableCell>
                  </TableRow>
                );
              })}

              {sortedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11}>No cards found for current filters.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <>
          <Box display="flex" flexDirection="row" flexWrap="wrap">
            {visibleGridItems.map((item, index) => (
              <Card
                key={item.key}
                player={username}
                name={item.cardItem.name}
                imageUrl={item.imageUrl}
                subTitle={
                  item.isMissing
                    ? "(Missing)"
                    : `(Lvl ${item.highestLevel}) - x${item.groupCards.length}`
                }
                allCards={item.groupCards}
                opacity={item.isMissing ? 0.3 : 1}
                priority={index < 6}
                priceInfo={item.priceInfo}
                onClick={() =>
                  openBuyDialog({
                    ...item.cardItem,
                    foil: item.foil,
                    currentCc: item.totalCc,
                  })
                }
              />
            ))}
          </Box>
          {visibleCount < sortedItems.length && <Box ref={gridSentinelRef} sx={{ height: 1 }} />}
        </>
      )}

      {dialogCard && (
        <BuyCardDialog
          open={dialogOpen}
          mode="manual-listings"
          account={username}
          card={dialogCard}
          initialFoilSelection={dialogCard.foil}
          currentCc={dialogCard.currentCc}
          selectableAccounts={selectableAccounts ?? [username]}
          onClose={() => setDialogOpen(false)}
          onAddToPurchasePlan={(items) => {
            addItems(items);
            setFeedback(`Added ${items.length} listing(s) to cart.`);
          }}
        />
      )}

      {feedbackError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setFeedbackError(null)}>
          {feedbackError}
        </Alert>
      )}

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={3000}
        onClose={() => setFeedback(null)}
        message={feedback}
      />
    </Box>
  );
};
