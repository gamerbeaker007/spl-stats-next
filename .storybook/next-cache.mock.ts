export default {
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  unstable_noStore: () => {},
};

export function revalidatePath(): void {}
export function revalidateTag(): void {}
export function unstable_noStore(): void {}
export function cacheLife(): void {}
export function cacheTag(): void {}

export function unstable_cache<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return fn;
}
