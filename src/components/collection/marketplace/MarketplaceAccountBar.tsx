"use client";

import MarketViewToggle from "@/components/collection/marketplace/MarketViewToggle";
import AccountSelectorBar from "@/components/shared/AccountSelectorBar";
import { useAccounts } from "@/lib/frontend/context/AccountsContext";
import { Box, Stack } from "@mui/material";
import { useState, type ReactNode } from "react";

interface MarketplaceAccountBarProps {
  /** Optional extra controls rendered inside the account selector row (e.g. a search field). */
  extraContent?: ReactNode;
}

/**
 * The account selector row shared by every marketplace shopping page: pick, add,
 * or remove the account whose ownership/prices are shown. Reads/writes the shared
 * `useAccounts()` context so all sections on a page stay on the same account.
 */
export default function MarketplaceAccountBar({
  extraContent,
}: Readonly<MarketplaceAccountBarProps>) {
  const {
    monitoredAccounts,
    selectedAccount,
    setSelectedAccount,
    accountOptions,
    addLocalAccount,
    removeLocalAccount,
  } = useAccounts();

  const [addAccountInput, setAddAccountInput] = useState("");

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        backgroundColor: "background.paper",
        border: 1,
        borderColor: "divider",
      }}
    >
      <Stack spacing={1.25}>
        <AccountSelectorBar
          accounts={accountOptions}
          selectedAccount={selectedAccount}
          onSelectedAccountChange={setSelectedAccount}
          addAccountInput={addAccountInput}
          onAddAccountInputChange={setAddAccountInput}
          onAddAccount={() => {
            addLocalAccount(addAccountInput);
            setAddAccountInput("");
          }}
          onRemoveSelected={() => removeLocalAccount(selectedAccount)}
          removeDisabled={!selectedAccount || monitoredAccounts.includes(selectedAccount)}
          extraContent={
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {extraContent}
              <MarketViewToggle />
            </Stack>
          }
        />
      </Stack>
    </Box>
  );
}
