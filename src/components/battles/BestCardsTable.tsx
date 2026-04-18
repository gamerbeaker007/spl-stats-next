"use client";

import type { BestCardStat } from "@/types/battles";
import { RARITY_LABELS } from "@/types/battles";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
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

type SortKey = "cardName" | "level" | "battles" | "wins" | "losses" | "winPercentage";

interface BestCardsTableProps {
  cards: BestCardStat[];
  onCardClick?: (cardDetailId: number) => void;
}

export default function BestCardsTable({ cards, onCardClick }: BestCardsTableProps) {
  const [query, setQuery] = useState("");
  const [orderBy, setOrderBy] = useState<SortKey>("battles");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (key: SortKey) => {
    if (orderBy === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
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
        All Cards ({filtered.length})
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
              {sortLabel("Battles", "battles", "right")}
              {sortLabel("Wins", "wins", "right")}
              {sortLabel("Losses", "losses", "right")}
              {sortLabel("Win %", "winPercentage", "right")}
              <TableCell>Type</TableCell>
              <TableCell>Rarity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((c) => {
              const winPctColor =
                c.winPercentage >= 60 ? "success" : c.winPercentage >= 45 ? "warning" : "error";

              return (
                <TableRow
                  key={`${c.cardDetailId}|${c.edition}|${c.foil}|${c.level}`}
                  hover
                  onClick={() => onCardClick?.(c.cardDetailId)}
                  sx={{ cursor: onCardClick ? "pointer" : "default" }}
                >
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
                  <TableCell align="right">{c.battles}</TableCell>
                  <TableCell align="right" sx={{ color: "success.main" }}>
                    {c.wins}
                  </TableCell>
                  <TableCell align="right" sx={{ color: "error.main" }}>
                    {c.losses}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${c.winPercentage}%`}
                      color={winPctColor as "success" | "warning" | "error"}
                      size="small"
                      sx={{ fontSize: "0.7rem" }}
                    />
                  </TableCell>
                  <TableCell>{c.cardType}</TableCell>
                  <TableCell>{RARITY_LABELS[c.rarity] ?? `R${c.rarity}`}</TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 3, color: "text.secondary" }}>
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
