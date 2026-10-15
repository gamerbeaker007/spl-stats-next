"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Settled<T> {
  key: string;
  data: T | undefined;
  error: string | null;
}

export interface UseAsyncDataOptions {
  /** Keep showing the previous key's data while the new key loads (default `true`). */
  keepPreviousData?: boolean;
  /** Error message when the loader throws a non-`Error` value. */
  errorMessage?: string;
}

export interface UseAsyncDataReturn<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  /**
   * Re-runs the loader for the current key; never rejects (failures land in `error`).
   * `silent` keeps `loading` false, for a background refresh that shouldn't flash a spinner.
   */
  refetch: (options?: { silent?: boolean }) => Promise<void>;
  /** Replaces the current key's data locally (e.g. with a fresher result polled elsewhere). */
  mutate: (data: T) => void;
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Loads data for `key` and reloads whenever `key` changes; `key = null` means "nothing
 * to load" (disabled / missing input). Encode every input the loader depends on in `key`.
 * The loader's `signal` aborts when the key changes or the component unmounts.
 *
 * `loading` is derived (settled key ≠ requested key), so no state is set synchronously
 * inside the effect, and a response for a superseded key is dropped instead of
 * overwriting newer data.
 */
export function useAsyncData<T>(
  key: string | null,
  loader: (signal: AbortSignal) => Promise<T>,
  options: UseAsyncDataOptions = {}
): UseAsyncDataReturn<T> {
  const { keepPreviousData = true, errorMessage = "Failed to load data" } = options;
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [refetching, setRefetching] = useState(0);

  const loaderRef = useRef(loader);
  const keyRef = useRef(key);
  const errorMessageRef = useRef(errorMessage);
  useEffect(() => {
    loaderRef.current = loader;
    keyRef.current = key;
    errorMessageRef.current = errorMessage;
  });

  const settle = useCallback((settledKey: string, result: { data: T } | { error: unknown }) => {
    setSettled((prev) =>
      "data" in result
        ? { key: settledKey, data: result.data, error: null }
        : {
            key: settledKey,
            data: prev?.key === settledKey ? prev.data : undefined,
            error: toErrorMessage(result.error, errorMessageRef.current),
          }
    );
  }, []);

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    loaderRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) settle(key, { data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) settle(key, { error });
      }
    );
    return () => controller.abort();
  }, [key, settle]);

  const refetch = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      const requestKey = keyRef.current;
      if (requestKey === null) return;
      if (!silent) setRefetching((n) => n + 1);
      try {
        const data = await loaderRef.current(new AbortController().signal);
        if (keyRef.current === requestKey) settle(requestKey, { data });
      } catch (error) {
        if (keyRef.current === requestKey) settle(requestKey, { error });
      } finally {
        if (!silent) setRefetching((n) => n - 1);
      }
    },
    [settle]
  );

  const mutate = useCallback(
    (data: T) => {
      const currentKey = keyRef.current;
      if (currentKey !== null) settle(currentKey, { data });
    },
    [settle]
  );

  const isCurrent = key !== null && settled?.key === key;
  return {
    data: key === null ? undefined : isCurrent || keepPreviousData ? settled?.data : undefined,
    loading: key !== null && (!isCurrent || refetching > 0),
    error: isCurrent ? settled.error : null,
    refetch,
    mutate,
  };
}
