"use client";

import type { CardOption } from "@/types/card";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";

interface Props {
  options: CardOption[];
  loading: boolean;
  value: CardOption | null;
  onChange: (value: CardOption | null) => void;
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
    <Autocomplete<CardOption>
      options={options}
      getOptionLabel={(o) => o.cardName}
      filterOptions={(opts, { inputValue }) => {
        const lower = inputValue.toLowerCase();
        return opts.filter((o) => o.cardName.toLowerCase().includes(lower)).slice(0, 5);
      }}
      isOptionEqualToValue={(o, v) => o.cardDetailId === v.cardDetailId}
      value={value}
      onChange={(_, newValue) => onChange(newValue)}
      loading={loading}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Search card"
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
