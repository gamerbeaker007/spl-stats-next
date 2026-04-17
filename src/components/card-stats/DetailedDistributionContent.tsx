"use client";

import CardStatsFilterDrawer from "@/components/card-stats/CardStatsFilterDrawer";
import CardStatsStatHeader from "@/components/card-stats/CardStatsStatHeader";
import { useCardStatsFilter } from "@/lib/frontend/context/CardStatsFilterContext";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import type { CardFoil } from "@/types/card";
import { cardFoilOptions } from "@/types/card";
import type { CardDistributionRow } from "@/types/card-stats";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Image from "next/image";
import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Card image helpers
// ---------------------------------------------------------------------------

const FOUNDATION_EDITIONS = new Set([15]);
const MAX_LEVEL: Record<number, number> = { 1: 10, 2: 8, 3: 6, 4: 4 };
const MAX_LEVEL_FOUNDATION: Record<number, number> = { 1: 5, 2: 4, 3: 3, 4: 2 };

function getRowImageUrl(row: CardDistributionRow): string {
  const isFoundation = FOUNDATION_EDITIONS.has(row.tier ?? 0); // for foundation tier is always filled else not foundation
  const levelMap = isFoundation ? MAX_LEVEL_FOUNDATION : MAX_LEVEL;
  const level = levelMap[row.rarity] ?? 1;
  const foilStr = (cardFoilOptions[row.foil] ?? "regular") as CardFoil;
  return getCardImageByLevel(row.name, row.edition, foilStr, level);
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

type SortKey =
  | keyof Pick<
      CardDistributionRow,
      | "name"
      | "rarityName"
      | "editionLabel"
      | "foilLabel"
      | "numCards"
      | "numBurned"
      | "unboundCards"
      | "bcx"
      | "burnedBcx"
      | "cp"
    >
  | "pctUnbound";

interface Column {
  key: SortKey;
  label: string;
  numeric: boolean;
}

const COLUMNS: Column[] = [
  { key: "name", label: "Name", numeric: false },
  { key: "rarityName", label: "Rarity", numeric: false },
  { key: "editionLabel", label: "Edition", numeric: false },
  { key: "foilLabel", label: "Foil", numeric: false },
  { key: "numCards", label: "Cards", numeric: true },
  { key: "numBurned", label: "Burned", numeric: true },
  { key: "unboundCards", label: "Unbound", numeric: true },
  { key: "bcx", label: "BCX", numeric: true },
  { key: "burnedBcx", label: "Burned BCX", numeric: true },
  { key: "cp", label: "CP", numeric: true },
  { key: "pctUnbound", label: "% Unbound", numeric: true },
];

interface Props {
  rows: CardDistributionRow[];
}

export default function DetailedDistributionContent({ rows }: Props) {
  const { filterRow } = useCardStatsFilter();
  const [sortKey, setSortKey] = useState<SortKey>("numCards");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const filtered = useMemo(() => rows.filter((element) => filterRow(element)), [rows, filterRow]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "pctUnbound") {
        const pa = a.numCards > 0 ? a.unboundCards / a.numCards : 0;
        const pb = b.numCards > 0 ? b.unboundCards / b.numCards : 0;
        return dir * (pa - pb);
      }
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string") return dir * va.localeCompare(vb);
      return dir * ((va as number) - (vb as number));
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      <Box sx={{ flex: 1, p: 2, minWidth: 0 }}>
        <CardStatsStatHeader rows={filtered} />

        <Alert severity="info" sx={{ mb: 2 }}>
          CP values for <strong>regular</strong> and <strong>gold</strong> cards may deviate
          slightly — it is not possible to determine how many of those cards are at max level. Max
          level cards receive a +5% CP bonus. For <strong>Gold Arcane</strong>,{" "}
          <strong>Black</strong>, and <strong>Black Arcane</strong> cards this bonus is already
          included, as these foil types are always at max level.
        </Alert>

        <TableContainer>
          <Table size="small" sx={{ tableLayout: "auto" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 56 }}>Img</TableCell>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.key}
                    align={col.numeric ? "right" : "left"}
                    sortDirection={sortKey === col.key ? sortDir : false}
                  >
                    <TableSortLabel
                      active={sortKey === col.key}
                      direction={sortKey === col.key ? sortDir : "asc"}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((row, idx) => {
                const pctUnbound =
                  row.numCards > 0 ? ((row.unboundCards / row.numCards) * 100).toFixed(1) : "0.0";
                return (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ p: 0.5 }}>
                      <Image
                        src={getRowImageUrl(row)}
                        alt={row.name}
                        width={40}
                        height={56}
                        style={{ objectFit: "contain", display: "block" }}
                        unoptimized
                      />
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.rarityName}</TableCell>
                    <TableCell>{row.editionLabel}</TableCell>
                    <TableCell>{row.foilLabel}</TableCell>
                    <TableCell align="right">{row.numCards.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.numBurned.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.unboundCards.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.bcx.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.burnedBcx.toLocaleString()}</TableCell>
                    <TableCell align="right">{row.cp.toLocaleString()}</TableCell>
                    <TableCell align="right">{pctUnbound}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={sorted.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100, 250]}
        />
      </Box>
      <CardStatsFilterDrawer />
    </Box>
  );
}
