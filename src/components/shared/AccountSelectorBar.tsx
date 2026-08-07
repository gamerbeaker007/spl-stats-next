"use client";

import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { ReactNode } from "react";
import { MdAdd, MdClose } from "react-icons/md";

interface AccountSelectorBarBaseProps {
  accounts: string[];
  addAccountInput: string;
  onAddAccountInputChange: (value: string) => void;
  onAddAccount: () => void;
  extraContent?: ReactNode;
  /** Accounts that are locally saved (not monitored) — shows an X button for direct removal. */
  localAccounts?: string[];
  /** Monitored accounts are never removable from this bar. */
  monitoredAccounts?: string[];
  /** Called when the X button on a local account is clicked. */
  onRemoveAccount?: (account: string) => void;
}

interface AccountSelectorBarSingleProps extends AccountSelectorBarBaseProps {
  multiSelect?: false;
  selectedAccount: string;
  onSelectedAccountChange: (account: string) => void;
}

interface AccountSelectorBarMultiProps extends AccountSelectorBarBaseProps {
  multiSelect: true;
  selectedAccounts: string[];
  onSelectedAccountsChange: (accounts: string[]) => void;
}

type AccountSelectorBarProps = AccountSelectorBarSingleProps | AccountSelectorBarMultiProps;

export default function AccountSelectorBar(props: Readonly<AccountSelectorBarProps>) {
  const {
    accounts,
    multiSelect,
    addAccountInput,
    onAddAccountInputChange,
    onAddAccount,
    extraContent,
    localAccounts,
    monitoredAccounts,
    onRemoveAccount,
  } = props;

  const selectedValue = multiSelect ? props.selectedAccounts : props.selectedAccount;
  const monitoredSet = new Set(monitoredAccounts ?? []);
  const localSet = new Set(localAccounts ?? []);

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
      <ToggleButtonGroup
        exclusive={!multiSelect}
        value={selectedValue}
        onChange={(_event, next) => {
          if (multiSelect) {
            if (Array.isArray(next)) {
              props.onSelectedAccountsChange(next.filter((entry) => typeof entry === "string"));
            }
            return;
          }

          if (typeof next === "string" && next.length > 0) {
            props.onSelectedAccountChange(next);
          }
        }}
        size="small"
        sx={{
          maxWidth: "100%",
          flexWrap: "wrap",
          gap: 0.5,
        }}
      >
        {accounts.map((account) => (
          <ToggleButton
            key={account}
            value={account}
            sx={{
              textTransform: "none",
              pr: localSet.has(account) && !monitoredSet.has(account) ? 0.5 : undefined,
            }}
          >
            {account}
            {localSet.has(account) && !monitoredSet.has(account) && onRemoveAccount && (
              <IconButton
                component="span"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveAccount(account);
                }}
                sx={{ ml: 0.5, p: 0.25 }}
                aria-label={`Remove ${account}`}
              >
                <MdClose size={14} />
              </IconButton>
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <TextField
        size="small"
        label="Add Account"
        value={addAccountInput}
        onChange={(event) => onAddAccountInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onAddAccount();
          }
        }}
        sx={{ minWidth: 220 }}
      />

      <Button size="small" variant="outlined" startIcon={<MdAdd />} onClick={onAddAccount}>
        Add Account
      </Button>

      {extraContent ? <Box>{extraContent}</Box> : null}
    </Stack>
  );
}
