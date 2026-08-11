import { unstable_rethrow } from "next/navigation";

/**
 * Re-throw Next.js internal control-flow errors so the framework can handle them.
 *
 * During prerendering, Next throws an internal abort signal when a dynamic API
 * such as `cookies()` is reached, so the render can bail out to the dynamic hole.
 * A `try/catch` around that access swallows the signal, which both logs a
 * confusing error at build time and makes the prerender behave as if the dynamic
 * value were simply absent (for example: "no logged-in user").
 *
 * Covers prerender bailouts, dynamic-API usage, `redirect()` and `notFound()`.
 * Returns normally for genuine application errors, which the caller should keep
 * handling as before.
 *
 * Call this FIRST in any `catch` that wraps a dynamic API.
 */
export function rethrowFrameworkErrors(error: unknown): void {
  unstable_rethrow(error);
}
