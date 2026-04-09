"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { useServerInsertedHTML } from "next/navigation";
import { createContext, useCallback, useContext, useReducer, useSyncExternalStore } from "react";
import theme from "@/lib/frontend/themes/theme";

// ─── Public API ──────────────────────────────────────────────────────────────

export type AppTheme = "light" | "dark" | "high-contrast";

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

// Reads spl-theme from localStorage and applies the appropriate classes to
// <html> before React hydrates. High-contrast maps to MUI's "dark" scheme
// + an extra "high-contrast" class so globals.css can override MUI's dark
// CSS vars via the higher-specificity .dark.high-contrast selector.
const FOUC_SCRIPT = `(function(){try{
  var t=localStorage.getItem('spl-theme')||localStorage.getItem('mui-mode')||'light';
  var muiScheme=t==='high-contrast'?'dark':t;
  localStorage.setItem('mui-mode',muiScheme);
  var html=document.documentElement;
  html.classList.remove('light','dark','high-contrast');
  html.classList.add(muiScheme);
  if(t==='high-contrast'){html.classList.add('high-contrast');}
}catch(e){}})();`;

// Returns false on server, true on client.
// The snapshot difference forces a re-render after hydration so the
// client can read the FOUC-applied classes from the DOM.
function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function ThemeContextBridge({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isMounted = useIsMounted();

  // forceUpdate triggers a re-render when the high-contrast class changes
  // without a colorScheme change (dark → high-contrast is a no-op for MUI).
  const [, forceUpdate] = useReducer((n: number) => n + 1, 0);

  // Read the DOM class directly — isMounted guarantees we're on the client.
  // The post-hydration re-render from useIsMounted picks up FOUC-applied classes.
  const actualTheme: AppTheme =
    isMounted &&
    colorScheme === "dark" &&
    document.documentElement.classList.contains("high-contrast")
      ? "high-contrast"
      : ((colorScheme ?? "light") as AppTheme);

  const handleSetTheme = useCallback(
    (t: AppTheme) => {
      localStorage.setItem("spl-theme", t);
      if (t === "high-contrast") {
        document.documentElement.classList.add("high-contrast");
        setColorScheme("dark");
      } else {
        document.documentElement.classList.remove("high-contrast");
        setColorScheme(t);
      }
      // Always force a re-render so actualTheme reflects the new classList,
      // even when setColorScheme is a no-op (e.g. dark → high-contrast).
      forceUpdate();
    },
    [setColorScheme]
  );

  return (
    <ThemeContext.Provider value={{ theme: actualTheme, setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function ThemeSetup({ children }: { children: React.ReactNode }) {
  useServerInsertedHTML(() => (
    <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: FOUC_SCRIPT }} />
  ));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ThemeContextBridge>{children}</ThemeContextBridge>
    </ThemeProvider>
  );
}
