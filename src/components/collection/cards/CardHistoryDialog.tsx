"use client";

import CardHistoryTable from "@/components/shared/CardHistoryTable";
import { useCardHistory } from "@/hooks/useCardHistory";
import type { CardDetail } from "@/types/card";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useEffect, useState } from "react";

function copyLabel(card: CardDetail): string {
  return `Lvl ${card.level} · ${card.bcx} CC · ${card.owner} · ${card.uid}`;
}

/**
 * Transfer/market history of one owned copy. When the group holds several copies,
 * a select lets the player pick one; the highest level (then highest CC) is shown first.
 */
export function CardHistoryDialog({
  name,
  cards,
  onClose,
}: Readonly<{ name: string; cards: CardDetail[]; onClose: () => void }>) {
  const sortedCards = [...cards].sort((a, b) => b.level - a.level || b.bcx - a.bcx);
  const [selectedUid, setSelectedUid] = useState(sortedCards[0]?.uid ?? "");
  const { cardHistory, loading, error, fetchCardHistory } = useCardHistory();

  useEffect(() => {
    if (selectedUid) fetchCardHistory(selectedUid);
  }, [selectedUid, fetchCardHistory]);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{name}</DialogTitle>
      <DialogContent dividers>
        {sortedCards.length > 1 && (
          <FormControl size="small" fullWidth sx={{ mb: 1 }}>
            <InputLabel>Copy ({sortedCards.length})</InputLabel>
            <Select
              label={`Copy (${sortedCards.length})`}
              value={selectedUid}
              onChange={(e) => setSelectedUid(String(e.target.value))}
            >
              {sortedCards.map((card) => (
                <MenuItem key={card.uid} value={card.uid}>
                  {copyLabel(card)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <CardHistoryTable cardHistory={cardHistory} loading={loading} error={error} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
