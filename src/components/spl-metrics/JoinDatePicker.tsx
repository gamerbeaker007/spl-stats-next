"use client";

/**
 * JoinDatePicker
 *
 * Checkbox to toggle join-date lines on charts.
 * When enabled, shows the user's monitored accounts as removable chips
 * plus an input to add extra accounts.
 */

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

import { getPlayerJoinDateAction } from "@/lib/backend/actions/spl-metrics-actions";

export interface JoinDateEntry {
  username: string;
  joinDate: string | null; // ISO string or null = not found
  loading?: boolean;
}

interface Props {
  monitoredAccounts: string[];
  entries: JoinDateEntry[];
  setEntries: (entries: JoinDateEntry[]) => void;
  showJoinDates: boolean;
  setShowJoinDates: (v: boolean) => void;
}

export default function JoinDatePicker({
  monitoredAccounts,
  entries,
  setEntries,
  showJoinDates,
  setShowJoinDates,
}: Props) {
  const [inputValue, setInputValue] = useState("");

  function toggle(checked: boolean) {
    setShowJoinDates(checked);
    // Populate with monitored accounts on first enable
    if (checked && entries.length === 0 && monitoredAccounts.length > 0) {
      loadAccounts(monitoredAccounts);
    }
  }

  async function loadAccounts(usernames: string[]) {
    // Add placeholders immediately so the UI shows loading state
    const placeholders: JoinDateEntry[] = usernames.map((u) => ({
      username: u,
      joinDate: null,
      loading: true,
    }));
    setEntries([...entries.filter((e) => !usernames.includes(e.username)), ...placeholders]);

    const resolved = await Promise.all(usernames.map((u) => getPlayerJoinDateAction(u)));
    setEntries([
      ...entries.filter((e) => !usernames.includes(e.username)),
      ...resolved.map((r) => ({ username: r.username, joinDate: r.joinDate, loading: false })),
    ]);
  }

  async function addAccount() {
    const username = inputValue.trim().toLowerCase();
    if (!username) return;
    if (entries.some((e) => e.username === username)) {
      setInputValue("");
      return;
    }
    setInputValue("");
    const withPlaceholder: JoinDateEntry[] = [
      ...entries,
      { username, joinDate: null, loading: true },
    ];
    setEntries(withPlaceholder);
    const result = await getPlayerJoinDateAction(username);
    setEntries([
      ...withPlaceholder.filter((e) => e.username !== username),
      { username, joinDate: result.joinDate, loading: false },
    ]);
  }

  function removeEntry(username: string) {
    setEntries(entries.filter((e) => e.username !== username));
  }

  if (!showJoinDates) {
    return (
      <FormControlLabel
        control={<Switch checked={false} onChange={(_, v) => toggle(v)} size="small" />}
        label="Show join dates"
      />
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <FormControlLabel
        control={<Switch checked onChange={(_, v) => toggle(v)} size="small" />}
        label="Show join dates"
      />

      {/* Tags */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, minHeight: 32 }}>
        {entries.map((e) => (
          <Chip
            key={e.username}
            label={
              e.loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {e.username}
                  <CircularProgress size={10} />
                </Box>
              ) : e.joinDate ? (
                `${e.username} (${e.joinDate.slice(0, 10)})`
              ) : (
                <Typography variant="caption" color="warning.main">
                  {e.username} — not found
                </Typography>
              )
            }
            onDelete={() => removeEntry(e.username)}
            size="small"
            color={e.joinDate ? "primary" : "default"}
            variant="outlined"
          />
        ))}
      </Box>

      {/* Add extra account */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Add account"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addAccount();
          }}
          sx={{ width: 200 }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ cursor: "pointer", userSelect: "none" }}
          onClick={addAccount}
        >
          Add
        </Typography>
      </Box>
    </Box>
  );
}
