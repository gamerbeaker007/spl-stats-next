"use client";

/**
 * AccountSelector
 *
 * Lets the user build the list of accounts whose fortune-draw wins are shown.
 * Pre-filled with the user's monitored accounts; extra accounts can be added
 * by typing a username and pressing Enter (or clicking Add).
 */

import { MdSearch } from "react-icons/md";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";

interface Props {
  accounts: string[];
  setAccounts: (accounts: string[]) => void;
  search: (accounts: string[]) => Promise<void>;
}

export default function AccountSelector({ accounts, setAccounts, search }: Props) {
  const [inputValue, setInputValue] = useState("");

  function addAccount() {
    const username = inputValue.trim().toLowerCase();
    setInputValue("");
    if (!username || accounts.includes(username)) return;

    const updated = [...accounts, username];
    setAccounts(updated);
    search(updated);
  }

  function removeAccount(username: string) {
    const updated = accounts.filter((e) => e !== username);
    setAccounts(updated);
    search(updated);
  }

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <Typography variant="subtitle2" color="text.secondary">
        Accounts in your search list
      </Typography>

      {/* Selected accounts */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, minHeight: 32 }}>
        {accounts.length === 0 ? (
          <Typography variant="body2" color="text.disabled">
            No accounts yet — add one below to see their wins.
          </Typography>
        ) : (
          accounts.map((username) => (
            <Chip
              key={username}
              label={username}
              onDelete={() => removeAccount(username)}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))
        )}
      </Box>

      {/* Add an account */}
      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
        <TextField
          size="small"
          label="Add account"
          placeholder="Splinterlands username"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addAccount();
            }
          }}
          helperText="Press Enter to add this account to the search list"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <MdSearch />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: 280 }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={addAccount}
          disabled={!inputValue.trim()}
          sx={{ mt: 0.5 }}
        >
          Add
        </Button>
      </Box>
    </Paper>
  );
}
