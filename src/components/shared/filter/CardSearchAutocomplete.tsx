"use client";

import type { CardOption } from "@/types/card";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";

interface Props {
  options: CardOption[];
  loading: boolean;
  value: CardOption[];
  onChange: (value: CardOption[]) => void;
  disabled?: boolean;
}

export default function CardSearchAutocomplete({
  options,
  loading,
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <Autocomplete<CardOption, true>
      multiple
      options={options}
      getOptionLabel={(o) => o.cardName}
      filterOptions={(opts, { inputValue }) => {
        const lower = inputValue.toLowerCase();
        return opts.filter((o) => o.cardName.toLowerCase().includes(lower));
      }}
      slotProps={{
        listbox: { sx: { maxHeight: 320, overflowY: "auto" } },
      }}
      isOptionEqualToValue={(o, v) => o.cardDetailId === v.cardDetailId}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      renderValue={() => null}
      loading={loading}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Search cards"
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={16} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
