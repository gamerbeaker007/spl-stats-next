"use client";

import { useCallback, useState, type SetStateAction } from "react";

/**
 * `useState` that snaps back to `initial` whenever `resetKey` changes — e.g. a page
 * index that resets when the filter changes. Replaces the "reset in an effect"
 * pattern, which renders once with the stale value before resetting.
 */
export function useResettableState<T>(initial: T, resetKey: unknown) {
  const [state, setState] = useState({ key: resetKey, value: initial });
  const value = Object.is(state.key, resetKey) ? state.value : initial;

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      setState((prev) => {
        const current = Object.is(prev.key, resetKey) ? prev.value : initial;
        const next = typeof action === "function" ? (action as (prev: T) => T)(current) : action;
        return { key: resetKey, value: next };
      });
    },
    [resetKey, initial]
  );

  return [value, setValue] as const;
}
