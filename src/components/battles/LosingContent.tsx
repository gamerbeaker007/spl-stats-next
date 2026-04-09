"use client";

import { useBattleFilter } from "@/lib/frontend/context/BattleFilterContext";
import { useLosingCards } from "@/hooks/battles/useLosingCards";
import CardStatsCard from "./CardStatsCard";
import BattleFilterDrawer, { DRAWER_WIDTH } from "./BattleFilterDrawer";
import type { LosingCardStat } from "@/types/battles";
import { RARITY_LABELS } from "@/types/battles";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useState } from "react";
import { MdFilterList } from "react-icons/md";
import { useMediaQuery } from "@/hooks/useMediaQuery";

type SortKey = "cardName" | "level" | "battles";

function LosingTable({ cards }: { cards: LosingCardStat[] }) {
  const [query, setQuery] = useState("");
  const [orderBy, setOrderBy] = useState<SortKey>("battles");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (orderBy === key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setOrderBy(key);
      setOrder("desc");
    }
  };

  const filtered = cards.filter((c) => c.cardName.toLowerCase().includes(query.toLowerCase()));

  const sorted = [...filtered].sort((a, b) => {
    const dir = order === "asc" ? 1 : -1;
    if (typeof a[orderBy] === "number") {
      return ((a[orderBy] as number) - (b[orderBy] as number)) * dir;
    }
    return (a[orderBy] as string).localeCompare(b[orderBy] as string) * dir;
  });

  const sortLabel = (label: string, sortKey: SortKey, align?: "right") => (
    <TableCell align={align}>
      <TableSortLabel
        active={orderBy === sortKey}
        direction={orderBy === sortKey ? order : "desc"}
        onClick={() => handleSort(sortKey)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        All Losing Cards ({filtered.length})
      </Typography>
      <TextField
        size="small"
        placeholder="Search card name…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 1.5, width: 240 }}
      />
      <TableContainer component={Paper} elevation={0} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 52 }}>Card</TableCell>
              {sortLabel("Name", "cardName")}
              {sortLabel("Lv", "level", "right")}
              {sortLabel("Times Lost", "battles", "right")}
              <TableCell>Type</TableCell>
              <TableCell>Rarity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((c) => (
              <TableRow key={`${c.cardDetailId}|${c.edition}`} hover>
                <TableCell sx={{ p: 0.5 }}>
                  <Box
                    sx={{
                      position: "relative",
                      width: 40,
                      height: 50,
                      borderRadius: 0.5,
                      overflow: "hidden",
                      bgcolor: "action.hover",
                    }}
                  >
                    <Image
                      src={c.imageUrl}
                      alt={c.cardName}
                      fill
                      style={{ objectFit: "cover", objectPosition: "top" }}
                      sizes="40px"
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {c.cardName}
                  </Typography>
                </TableCell>
                <TableCell align="right">{c.level}</TableCell>
                <TableCell align="right" sx={{ color: "error.main", fontWeight: 600 }}>
                  {c.battles}
                </TableCell>
                <TableCell>{c.cardType}</TableCell>
                <TableCell>{RARITY_LABELS[c.rarity] ?? `R${c.rarity}`}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                  No cards match the search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default function LosingContent() {
  const { filter, toggleFilterOpen } = useBattleFilter();
  const { cards, loading, error } = useLosingCards(filter);
  const isDesktop = useMediaQuery("(min-width:900px)");

  const topCards = cards.slice(0, filter.topCount);

  return (
    <Box sx={{ display: "flex", minHeight: "100%" }}>
      <Box
        sx={{
          flex: 1,
          p: 2,
          mr: isDesktop && filter.filterOpen ? `${DRAWER_WIDTH}px` : 0,
          transition: "margin 0.2s",
          minWidth: 0,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          {(!filter.filterOpen || !isDesktop) && (
            <IconButton size="small" onClick={toggleFilterOpen} title="Open filter">
              <MdFilterList size={20} />
            </IconButton>
          )}
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Losing Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Opponent cards you lose most against
            </Typography>
          </Box>
        </Stack>

        {!filter.account && (
          <Alert severity="info">
            Select an account in the filter panel to see your losing statistics.
          </Alert>
        )}
        {filter.account && error && <Alert severity="error">{error}</Alert>}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && filter.account && cards.length === 0 && !error && (
          <Alert severity="info">
            No losing data found. Try adjusting the filters or import battle history.
          </Alert>
        )}

        {!loading && cards.length > 0 && (
          <>
            {/* Your nemesis — top X losing cards */}
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Your Nemesis — Top {filter.topCount} Cards
            </Typography>
            <Stack direction="row" spacing={0} sx={{ flexWrap: "wrap", gap: 2, mb: 4 }}>
              {topCards.map((card) => (
                <CardStatsCard
                  key={`${card.cardDetailId}|${card.edition}`}
                  card={card}
                  showWinRate={false}
                />
              ))}
            </Stack>

            {/* Full table */}
            <LosingTable cards={cards} />
          </>
        )}
      </Box>

      <BattleFilterDrawer />
    </Box>
  );
}
