"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
// Fallback when localStorage is unavailable (private mode) — the value still applies in memory.
const memory = new Map<string, string>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string): string | null {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) return stored;
  } catch {
    // localStorage unavailable — fall through to the in-memory value.
  }
  return memory.get(key) ?? null;
}

/**
 * A localStorage string value (`null` when unset). Renders `undefined` on the server and
 * during hydration, then the stored value — so the first client render matches the server HTML.
 */
export function useLocalStorageValue(key: string) {
  const value = useSyncExternalStore<string | null | undefined>(
    subscribe,
    () => read(key),
    () => undefined
  );

  const setValue = useCallback(
    (next: string) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Ignore persistence failures; the in-memory value still applies.
      }
      listeners.forEach((listener) => listener());
    },
    [key]
  );

  return [value, setValue] as const;
}
