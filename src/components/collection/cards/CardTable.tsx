"use client";

import CardTableIcon from "@/components/collection/buy-missing-cc/CardTableIcon";
import { getFoilLabel, toCardFoilInt } from "@/lib/shared/card-utils";
import { formatPct, pctChange, pctColor } from "@/lib/shared/card-watch-utils";
import { getEditionIconUrl, getEditionLabel } from "@/lib/shared/edition-utils";
import { getRarityIconUrl } from "@/lib/shared/rarity-utils";
import type { CardFoil } from "@/types/card";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
} from "@mui/material";
import Image from "next/image";
import { type ReactNode, useEffect, useState } from "react";
import { MdLocalOffer } from "react-icons/md";
import type { CardDisplayItem } from "./card-display-item";
import type { CardSort, CardSortField } from "./card-sort";
import { LiveCount, LivePrice } from "./LivePrice";
import { WatchButton } from "./WatchButton";

const ROWS_PER_PAGE_OPTIONS = [50, 100, 200];
const DEFAULT_ROWS_PER_PAGE = 50;

function shortFoil(foil: CardFoil): string {
  if (foil === "regular") return "R";
  if (foil === "gold") return "G";
  if (foil === "gold arcane") return "GA";
  if (foil === "black") return "B";
  return "BA";
}

function WatchChangeCell({ watched, current }: Readonly<{ watched?: number; current?: number }>) {
  const pct = watched === undefined ? null : pctChange(watched, current);
  return (
    <TableCell sx={{ color: pct === null ? undefined : pctColor(pct) }}>
      {pct === null ? "-" : formatPct(pct)}
    </TableCell>
  );
}

function SortHeader({
  field,
  sort,
  onSortChange,
  title,
  children,
}: Readonly<{
  field: CardSortField;
  sort: CardSort;
  onSortChange: (sort: CardSort) => void;
  title?: string;
  children: ReactNode;
}>) {
  const active = sort.field === field;
  return (
    <TableCell>
      <TableSortLabel
        active={active}
        direction={active ? sort.dir : "asc"}
        onClick={() => onSortChange({ field, dir: active && sort.dir === "asc" ? "desc" : "asc" })}
      >
        {title ? (
          <Tooltip title={title}>
            <span>{children}</span>
          </Tooltip>
        ) : (
          children
        )}
      </TableSortLabel>
    </TableCell>
  );
}

export function CardTable({
  items,
  sort,
  onSortChange,
  dimMissing,
  onBuy,
  onToggleWatch,
}: Readonly<{
  items: CardDisplayItem[];
  sort: CardSort;
  onSortChange: (sort: CardSort) => void;
  dimMissing: boolean;
  onBuy: (item: CardDisplayItem) => void;
  /** Omit to hide the watch columns (guests). */
  onToggleWatch?: (cardDetailId: number, foil: number) => void;
}>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  useEffect(() => {
    // Back to page 1 on filter/sort changes; a live price refresh keeps the row count, so the page stays.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0);
  }, [items.length, sort.field, sort.dir]);

  const maxPage = Math.max(0, Math.ceil(items.length / rowsPerPage) - 1);
  const currentPage = Math.min(page, maxPage);
  const pagedItems = items.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);
  const sortProps = { sort, onSortChange };

  return (
    <>
      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {onToggleWatch && <TableCell sx={{ px: 0.5 }} />}
              <TableCell sx={{ minWidth: 70, maxWidth: 70, px: 0.5 }}>Card</TableCell>
              <TableCell align="center">Buy</TableCell>
              <SortHeader field="name" {...sortProps}>
                Name
              </SortHeader>
              <SortHeader field="default" {...sortProps}>
                #
              </SortHeader>
              <SortHeader field="rarity" title="Rarity" {...sortProps}>
                R
              </SortHeader>
              <SortHeader field="edition" title="Edition" {...sortProps}>
                E
              </SortHeader>
              <SortHeader field="foil" title="Foil" {...sortProps}>
                F
              </SortHeader>
              <SortHeader field="hiLv" title="Highest owned level" {...sortProps}>
                Hi Lv
              </SortHeader>
              <SortHeader field="hiCc" title="BCX in highest-level copy" {...sortProps}>
                Hi CC
              </SortHeader>
              <SortHeader field="totCc" title="Total owned BCX" {...sortProps}>
                Tot CC
              </SortHeader>
              <SortHeader field="priceCc" title="Lowest price per BCX" {...sortProps}>
                Price/CC
              </SortHeader>
              <SortHeader field="oneCc" title="Lowest 1 BCX price" {...sortProps}>
                1 CC
              </SortHeader>
              <SortHeader field="listed" title="Number of listed cards" {...sortProps}>
                Listed
              </SortHeader>
              {onToggleWatch && (
                <>
                  <TableCell>
                    <Tooltip title="Price/CC change since watched">
                      <span>Δ Price/CC</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="1 CC change since watched">
                      <span>Δ 1 CC</span>
                    </Tooltip>
                  </TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedItems.map((item) => {
              const rarityIcon = getRarityIconUrl(item.cardItem.rarity);
              const editionIcon = getEditionIconUrl(item.cardItem.edition);

              return (
                <TableRow
                  key={item.key}
                  hover
                  sx={{ opacity: item.isMissing && dimMissing ? 0.65 : 1 }}
                >
                  {onToggleWatch && (
                    <TableCell sx={{ px: 0.5 }}>
                      <WatchButton
                        watch={item.watch}
                        priceInfo={item.priceInfo}
                        onToggle={() =>
                          onToggleWatch(item.cardItem.cardDetailId, toCardFoilInt(item.foil))
                        }
                      />
                    </TableCell>
                  )}
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
                          onClick={() => onBuy(item)}
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
                        getEditionLabel(item.cardItem.edition) ?? `Edition ${item.cardItem.edition}`
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
                    <LivePrice value={item.priceInfo?.lowPriceBcx} />
                  </TableCell>
                  <TableCell>
                    <LivePrice value={item.priceInfo?.lowPrice} />
                  </TableCell>
                  <TableCell>
                    <LiveCount value={item.priceInfo?.qty} />
                  </TableCell>
                  {onToggleWatch && (
                    <>
                      <WatchChangeCell
                        watched={item.watch?.lowPriceBcxAtWatch}
                        current={item.priceInfo?.lowPriceBcx}
                      />
                      <WatchChangeCell
                        watched={item.watch?.lowPriceAtWatch}
                        current={item.priceInfo?.lowPrice}
                      />
                    </>
                  )}
                </TableRow>
              );
            })}

            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={onToggleWatch ? 16 : 13}>
                  No cards found for current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={items.length}
        page={currentPage}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      />
    </>
  );
}
