"use client";

/**
 * AccountSelector
 *
 * toggle between monitored accounts and extra accounts for fortune winners search
 *
 */

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
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

  async function addAccount() {
    const username = inputValue.trim().toLowerCase();
    if (!username) return;
    if (accounts.some((e) => e === username)) {
      setInputValue("");
      return;
    }
    setInputValue("");
    setAccounts([...accounts, username]);
    search([...accounts, username]);
  }

  function removeAccount(username: string) {
    const updatedAccounts = accounts.filter((e) => e !== username);
    setAccounts(updatedAccounts);
    search(updatedAccounts);
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {/* Tags */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, minHeight: 32 }}>
        {accounts.map((username) => (
          <Chip
            key={username}
            label={username}
            onDelete={() => removeAccount(username)}
            size="small"
            color="primary"
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
