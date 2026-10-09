"use client";

import { Box, keyframes } from "@mui/material";
import { type ReactNode, useState } from "react";

// Only a `from` frame: the animation fades back to the element's normal styling.
const flashKeyframes = {
  up: keyframes`from { color: var(--mui-palette-error-main); font-weight: 700; }`,
  down: keyframes`from { color: var(--mui-palette-success-main); font-weight: 700; }`,
  changed: keyframes`from { color: var(--mui-palette-primary-main); font-weight: 700; }`,
};
type FlashKind = keyof typeof flashKeyframes;

const FLASH_SECONDS = 10;

/** Flashes its children whenever `value` changes between renders (not on first mount). */
function FlashOnChange<T>({
  value,
  kindOf,
  children,
}: Readonly<{ value: T; kindOf: (prev: T, next: T) => FlashKind | null; children: ReactNode }>) {
  const [prevValue, setPrevValue] = useState(value);
  const [flash, setFlash] = useState<{ kind: FlashKind; n: number } | null>(null);

  if (value !== prevValue) {
    setPrevValue(value);
    const kind = kindOf(prevValue, value);
    if (kind) setFlash({ kind, n: (flash?.n ?? 0) + 1 });
  }

  return (
    <Box
      component="span"
      // New key restarts the animation on every change.
      key={flash?.n ?? 0}
      // Keyframes must go through sx so emotion injects them.
      sx={
        flash
          ? { animation: `${flashKeyframes[flash.kind]} ${FLASH_SECONDS}s ease-out` }
          : undefined
      }
    >
      {children}
    </Box>
  );
}

/** USD price that flashes bold red (up) or bold green (down) when it changes. */
export function LivePrice({ value }: Readonly<{ value: number | undefined }>) {
  return (
    <FlashOnChange
      value={value}
      kindOf={(prev, next) => (prev && next ? (next > prev ? "up" : "down") : null)}
    >
      {value && value > 0 ? `$${value.toFixed(3)}` : "-"}
    </FlashOnChange>
  );
}

/** Count (e.g. listed quantity) that flashes in a neutral color when it changes. */
export function LiveCount({ value }: Readonly<{ value: number | undefined }>) {
  return (
    <FlashOnChange
      value={value}
      kindOf={(prev, next) => (prev !== undefined && next !== undefined ? "changed" : null)}
    >
      {value ?? "-"}
    </FlashOnChange>
  );
}

/** Timestamp that flashes when it changes, e.g. when new market data arrives. */
export function LiveTimestamp({ value }: Readonly<{ value: string | undefined }>) {
  return (
    <FlashOnChange value={value} kindOf={(prev, next) => (prev && next ? "changed" : null)}>
      {value ? new Date(value).toLocaleString() : "-"}
    </FlashOnChange>
  );
}
