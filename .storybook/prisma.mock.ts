/**
 * Storybook-only Prisma stub.
 *
 * `prisma.ts` checks for DATABASE_URL at module-evaluation time and throws if
 * it is absent. In a Storybook browser bundle the env var is never defined, so
 * any transitive import of `@/lib/prisma` crashes the bundle before a single
 * story can render.
 *
 * This file is aliased to `@/lib/prisma` by `.storybook/main.ts` so the real
 * module is never evaluated. Every property access returns a new stub and every
 * call returns a resolved Promise, which is enough for fire-and-forget DB
 * writes (e.g. the logger) that are incidentally bundled but never actually
 * invoked in the browser.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeStub = (): any =>
  new Proxy(function () {} as object, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(_t, prop: string | symbol): any {
      // Prevent Promise.resolve(stub) from thinking the stub is a thenable.
      if (prop === "then" || prop === Symbol.toPrimitive || prop === Symbol.iterator)
        return undefined;
      return makeStub();
    },
    apply: () => Promise.resolve(null),
    construct: () => makeStub(),
  });

const stub = makeStub();
export default stub;
export const prisma = stub;
