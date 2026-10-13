"use client";

/**
 * Tiny in-tab memo for browser SPL reads. Concurrent callers for the same key
 * share one in-flight request, and a successful result is reused for `ttlMs`
 * then dropped (collections can be MBs). Failures are never cached.
 *
 * Scope is one browser tab: it dedupes requests between components and page
 * navigations, not across visitors — shared data belongs in the server cache.
 */
export function createBrowserCache<T>(ttlMs: number) {
  const entries = new Map<string, Promise<T>>();

  return function cached(key: string, load: () => Promise<T>): Promise<T> {
    const hit = entries.get(key);
    if (hit) return hit;

    const promise = load();
    entries.set(key, promise);
    const evict = () => {
      if (entries.get(key) === promise) entries.delete(key);
    };
    promise.then(() => setTimeout(evict, ttlMs), evict);
    return promise;
  };
}
