"use client";

import { Button, Tooltip } from "@mui/material";

export interface CombineLevelButtonVm {
  level: number;
  isReachable: boolean;
  isBelowOrAtCurrent: boolean;
  isBlockedByUnavailableCards: boolean;
  tooltip: string;
}

interface CombineLevelButtonProps {
  vm: CombineLevelButtonVm;
  isSelected: boolean;
  disabled: boolean;
  onSelect: (level: number) => void;
}

export default function CombineLevelButton({
  vm,
  isSelected,
  disabled,
  onSelect,
}: Readonly<CombineLevelButtonProps>) {
  const { level, isReachable, isBelowOrAtCurrent, isBlockedByUnavailableCards, tooltip } = vm;

  return (
    <Tooltip title={tooltip} placement="top">
      <span>
        <Button
          variant={isSelected ? "contained" : "outlined"}
          size="small"
          onClick={() => isReachable && !isBelowOrAtCurrent && onSelect(level)}
          disabled={disabled || isBelowOrAtCurrent || !isReachable}
          sx={{
            minWidth: 38,
            fontWeight: isSelected ? 700 : 400,

            ...(isSelected && {
              bgcolor: "success.main",
              borderColor: "success.main",
              color: "white",
              "&:hover": { bgcolor: "success.dark" },
            }),

            ...(isReachable &&
              !isSelected &&
              !isBelowOrAtCurrent && {
                borderColor: "success.main",
                color: "success.main",
                "&:hover": {
                  bgcolor: "success.light",
                  opacity: 0.8,
                },
              }),

            ...(isBlockedByUnavailableCards && {
              borderColor: "warning.main",
              color: "warning.main",
              "&.Mui-disabled": {
                borderColor: "warning.main",
                color: "warning.main",
                opacity: 0.6,
                WebkitTextFillColor: "currentColor",
              },
            }),
          }}
        >
          {level}
        </Button>
      </span>
    </Tooltip>
  );
}
