"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

const PageTitleContext = createContext<{
  title: string;
  setTitle: (title: string) => void;
}>({ title: "Dashboard", setTitle: () => {} });

export function PageTitleProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [title, setTitle] = useState("SPL Stats");
  const contextValue = { title, setTitle };

  return <PageTitleContext.Provider value={contextValue}>{children}</PageTitleContext.Provider>;
}

/**
 * Hook to set the page title in the top bar.
 * @param title - Optional title to set. If provided, will set the title on mount.
 * @returns Object with current title and setTitle function for manual updates
 */
export function usePageTitle(title?: string) {
  const context = useContext(PageTitleContext);

  useEffect(() => {
    if (title) {
      context.setTitle(title);
    }
  }, [title, context]);

  return context;
}
