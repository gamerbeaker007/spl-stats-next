let shutdownRequested = false;
let sleepResolve: (() => void) | null = null;

export function shouldShutdown(): boolean {
  return shutdownRequested;
}

/** Register SIGTERM/SIGINT handlers. Call once at startup. */
export function registerShutdownHandlers() {
  const handler = () => {
    shutdownRequested = true;
    // Wake up any interruptible sleep
    if (sleepResolve) {
      sleepResolve();
      sleepResolve = null;
    }
  };

  process.on("SIGTERM", handler);
  process.on("SIGINT", handler);
}

/** Sleep that can be interrupted by shutdown signals. */
export function interruptibleSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (shutdownRequested) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      sleepResolve = null;
      resolve();
    }, ms);

    sleepResolve = () => {
      clearTimeout(timer);
      resolve();
    };
  });
}
