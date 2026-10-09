"use client";

import BuyCardDialog from "@/components/collection/buy-card-dialog/BuyCardDialog";
import { useCardFilter } from "@/lib/frontend/context/CardFilterContext";
import { useMarketplaceView } from "@/lib/frontend/context/MarketplaceViewContext";
import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import { matchesCardFilter } from "@/lib/shared/card-filter-utils";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { toCardFoilInt } from "@/lib/shared/card-utils";
import { getRarityId } from "@/lib/shared/rarity-utils";
import {
  CardFoil,
  type DetailedPlayerCardCollection,
  DetailedPlayerCardCollectionItem,
} from "@/types/card";
import type { CardWatch } from "@/types/card-watch";
import type { MarketPriceInfo } from "@/types/spl/market";
import { Alert, Box, Snackbar, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "./Card";
import type { CardDisplayItem } from "./card-display-item";
import type { CardSort } from "./card-sort";
import { CardHistoryDialog } from "./CardHistoryDialog";
import { CardTable } from "./CardTable";
import { LiveTimestamp } from "./LivePrice";

interface CardSectionProps {
  username: string;
  playerCards: DetailedPlayerCardCollection;
  selectableAccounts?: string[];
  /** Card view only — the table always shows prices. */
  showPrices?: boolean;
  marketPrices?: Record<string, MarketPriceInfo>;
  /** When the shown prices were fetched from SPL (ISO string). */
  pricesFetchedAt?: string;
  /** Keyed by `${cardDetailId}-${foilInt}`, like marketPrices. */
  watches?: Record<string, CardWatch>;
  /** Omit to hide the watch buttons (guests). */
  onToggleWatch?: (cardDetailId: number, foil: number) => void;
  watchedOnly?: boolean;
  sort: CardSort;
  onSortChange: (sort: CardSort) => void;
}

type DialogCard = DetailedPlayerCardCollectionItem & {
  foil: CardFoil;
  currentCc: number;
};

const GRID_BATCH_SIZE = 40;

export const CardSection = ({
  username,
  playerCards,
  selectableAccounts,
  showPrices,
  marketPrices,
  pricesFetchedAt,
  watches,
  onToggleWatch,
  watchedOnly = false,
  sort,
  onSortChange,
}: CardSectionProps) => {
  const { filter } = useCardFilter();
  const { addItems } = usePurchasePlan();
  const { viewMode } = useMarketplaceView();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [dialogCard, setDialogCard] = useState<DialogCard | null>(null);
  const { field: sortBy, dir: sortDir } = sort;
  // Every card is missing in "only" mode, so the greyed-out missing styling adds nothing.
  const dimMissing = filter.missingCards !== "only";
  const [visibleCount, setVisibleCount] = useState(GRID_BATCH_SIZE);
  const gridSentinelRef = useRef<HTMLDivElement | null>(null);

  // Rendered here, not inside Card: portal clicks bubble through the React tree to Card's onClick.
  const [historyItem, setHistoryItem] = useState<CardDisplayItem | null>(null);

  const openBuyDialogFor = (item: CardDisplayItem) => {
    setDialogCard({ ...item.cardItem, foil: item.foil, currentCc: item.totalCc });
    setDialogOpen(true);
  };

  const displayItems = useMemo<CardDisplayItem[]>(() => {
    const items: CardDisplayItem[] = [];
    let sourceOrder = 0;

    for (const cardItem of Object.values(playerCards)) {
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

      // Collected per card so foils can be ordered before assigning sourceOrder.
      const cardRows: Omit<CardDisplayItem, "sourceOrder">[] = [];

      if (filter.missingCards !== "only") {
        for (const group of filteredOwnedGroups) {
          const priceKey = `${cardItem.cardDetailId}-${toCardFoilInt(group.foil)}`;
          cardRows.push({
            key: `${cardItem.cardDetailId}-${group.edition}-${group.foil}`,
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
            priceInfo: marketPrices?.[priceKey],
            watch: watches?.[priceKey],
          });
        }
      }

      if (filter.missingCards !== "hide") {
        // Missing-foil behavior:
        // - one foil selected => one missing row in that foil
        // - multiple foils selected => one missing row per selected foil
        // - no foil selected => regular foil (watched only: every foil, so watched unowned foils show)
        const requestedFoils: CardFoil[] =
          filter.foilCategories.length > 0
            ? filter.foilCategories
            : watchedOnly
              ? cardItem.availableFoils
              : ["regular"];
        const ownedFoilSet = new Set(Object.values(cardsByEditionAndFoil).map((g) => g.foil));
        const missingFoils = requestedFoils.filter(
          (foil) => cardItem.availableFoils.includes(foil) && !ownedFoilSet.has(foil)
        );

        for (const foil of missingFoils) {
          const priceKey = `${cardItem.cardDetailId}-${toCardFoilInt(foil)}`;
          cardRows.push({
            key: `${cardItem.cardDetailId}-missing-${cardItem.edition}-${foil}`,
            cardItem,
            foil,
            highestLevel: 0,
            highestCc: 0,
            totalCc: 0,
            isMissing: true,
            imageUrl: getCardImageByLevel(cardItem.name, cardItem.edition, foil),
            groupCards: [],
            priceInfo: marketPrices?.[priceKey],
            watch: watches?.[priceKey],
          });
        }
      }

      cardRows.sort((a, b) => toCardFoilInt(a.foil) - toCardFoilInt(b.foil));
      for (const row of cardRows) {
        if (watchedOnly && !row.watch) continue;
        items.push({ ...row, sourceOrder: sourceOrder++ });
      }
    }

    return items;
  }, [filter, playerCards, marketPrices, watches, watchedOnly]);

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
        if (sortBy === "foil") return toCardFoilInt(a.foil) - toCardFoilInt(b.foil);
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
  }, [sortedItems.length, sortBy, sortDir, viewMode]);

  useEffect(() => {
    if (viewMode !== "card") return;
    if (visibleCount >= sortedItems.length) return;
    const sentinel = gridSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisibleCount((current) => Math.min(current + GRID_BATCH_SIZE, sortedItems.length));
      },
      // Re-created on every visibleCount change, so the callback fires again while the
      // sentinel stays in view (happens in multi-account columns, where one batch does
      // not fill the viewport). Large margin loads the next batch before hitting bottom.
      { root: null, rootMargin: "800px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sortedItems.length, viewMode, visibleCount]);

  const visibleGridItems = sortedItems.slice(0, visibleCount);

  return (
    <Box display="flex" flex={1} flexDirection="column">
      <Box display="flex" alignItems="baseline" justifyContent="space-between" gap={1}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          CARDS: ({sortedItems.length})
        </Typography>
        {(viewMode === "table" || showPrices) && pricesFetchedAt && (
          <Tooltip title="When these market prices were fetched from Splinterlands">
            <Typography variant="caption" color="text.secondary">
              Prices: <LiveTimestamp value={pricesFetchedAt} />
            </Typography>
          </Tooltip>
        )}
      </Box>

      {viewMode === "table" ? (
        <CardTable
          items={sortedItems}
          sort={sort}
          onSortChange={onSortChange}
          dimMissing={dimMissing}
          onBuy={openBuyDialogFor}
          onToggleWatch={onToggleWatch}
        />
      ) : (
        <>
          <Box display="flex" flexDirection="row" flexWrap="wrap" gap={1}>
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
                foil={item.foil}
                opacity={item.isMissing && dimMissing ? 0.3 : 1}
                priority={index < 6}
                priceInfo={item.priceInfo}
                showPrices={showPrices}
                watch={item.watch}
                onToggleWatch={
                  onToggleWatch
                    ? () => onToggleWatch(item.cardItem.cardDetailId, toCardFoilInt(item.foil))
                    : undefined
                }
                onShowHistory={item.groupCards.length > 0 ? () => setHistoryItem(item) : undefined}
                onClick={() => openBuyDialogFor(item)}
              />
            ))}
          </Box>
          {visibleCount < sortedItems.length && (
            // "1px" — sx height 1 would resolve to 100% (MUI sizing transform).
            <Box ref={gridSentinelRef} sx={{ height: "1px", width: "100%" }} />
          )}
        </>
      )}

      {historyItem && (
        <CardHistoryDialog
          key={historyItem.key}
          name={historyItem.cardItem.name}
          cards={historyItem.groupCards}
          onClose={() => setHistoryItem(null)}
        />
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
