"use client";

import { Box, Button, Stack, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { ReactNode } from "react";
import { MdAdd } from "react-icons/md";

interface AccountSelectorBarBaseProps {
  accounts: string[];
  addAccountInput: string;
  onAddAccountInputChange: (value: string) => void;
  onAddAccount: () => void;
  onRemoveSelected: () => void;
  removeDisabled?: boolean;
  extraContent?: ReactNode;
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
    onRemoveSelected,
    removeDisabled,
    extraContent,
  } = props;

  const selectedValue = multiSelect ? props.selectedAccounts : props.selectedAccount;

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
          <ToggleButton key={account} value={account} sx={{ textTransform: "none" }}>
            {account}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <TextField
        size="small"
        label="Add Account"
        value={addAccountInput}
        onChange={(event) => onAddAccountInputChange(event.target.value)}
        sx={{ minWidth: 220 }}
      />

      <Button size="small" variant="outlined" startIcon={<MdAdd />} onClick={onAddAccount}>
        Add Account
      </Button>

      <Button size="small" variant="text" onClick={onRemoveSelected} disabled={removeDisabled}>
        Remove Local
      </Button>

      {extraContent ? <Box>{extraContent}</Box> : null}
    </Stack>
  );
}
