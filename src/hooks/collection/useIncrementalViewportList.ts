"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface IncrementalViewportListOptions {
  enabled: boolean;
  batchSize?: number;
  rootMargin?: string;
}

interface IncrementalViewportListResult<T> {
  visibleItems: T[];
  visibleCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  sentinelRef: (node: HTMLDivElement | null) => void;
}

export function useIncrementalViewportList<T>(
  items: T[],
  options: IncrementalViewportListOptions
): IncrementalViewportListResult<T> {
  const batchSize = Math.max(1, options.batchSize ?? 48);
  const rootMargin = options.rootMargin ?? "500px 0px";

  const [visibleCount, setVisibleCount] = useState(() =>
    options.enabled ? Math.min(batchSize, items.length) : items.length
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sentinelNode, setSentinelNode] = useState<HTMLDivElement | null>(null);
  const loadLockRef = useRef(false);

  const hasMore = options.enabled && visibleCount < items.length;

  useEffect(() => {
    setVisibleCount(options.enabled ? Math.min(batchSize, items.length) : items.length);
    setIsLoadingMore(false);
    loadLockRef.current = false;
  }, [items, options.enabled, batchSize]);

  const loadMore = useCallback(() => {
    if (!options.enabled) return;
    if (loadLockRef.current) return;

    setVisibleCount((current) => {
      if (current >= items.length) return current;

      loadLockRef.current = true;
      setIsLoadingMore(true);
      const next = Math.min(current + batchSize, items.length);

      setTimeout(() => {
        loadLockRef.current = false;
        setIsLoadingMore(false);
      }, 0);

      return next;
    });
  }, [batchSize, items.length, options.enabled]);

  useEffect(() => {
    if (!hasMore || !sentinelNode) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { root: null, rootMargin, threshold: 0 }
    );

    observer.observe(sentinelNode);
    return () => observer.disconnect();
  }, [hasMore, loadMore, rootMargin, sentinelNode]);

  return {
    visibleItems: options.enabled ? items.slice(0, visibleCount) : items,
    visibleCount: options.enabled ? visibleCount : items.length,
    hasMore,
    isLoadingMore,
    sentinelRef: setSentinelNode,
  };
}
