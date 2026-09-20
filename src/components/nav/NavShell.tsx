"use client";

import { FILTER_PANEL_WIDTH_VAR } from "@/components/shared/filter/filterPanelLayout";
import NavSidebar from "@/components/side-bar/SideBar";
import TopBar, { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import React, { Suspense, useEffect, useRef, useState } from "react";

const SIDEBAR_COLLAPSED_WIDTH = 56;
const SIDEBAR_EXPANDED_WIDTH = 240;

export default function NavShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Docking the filter panel resizes `main` without the window changing, so
  // anything that only listens for `window.resize` (Plotly's `useResizeHandler`,
  // among others) would keep its old width. Watching `main` covers the whole
  // open/close animation as well as the sidebar collapse; browser resizes
  // already fire the event themselves.
  useEffect(() => {
    const main = mainRef.current;
    if (!main || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      // The width transition fires many callbacks; coalesce to one a frame.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    });

    observer.observe(main);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  function handleHamburger() {
    if (isMobile) {
      setMobileOpen((o) => !o);
    } else {
      setExpanded((e) => !e);
    }
  }

  function isExpanded() {
    return expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;
  }
  function determineSidebarWidth() {
    return isMobile ? 0 : isExpanded();
  }

  return (
    <>
      <Suspense>
        <TopBar onHamburgerClick={handleHamburger} />
      </Suspense>
      <NavSidebar
        expanded={expanded}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main
        ref={mainRef}
        style={{
          paddingTop: APP_BAR_HEIGHT,
          marginTop: 10,
          marginLeft: determineSidebarWidth() + 10,
          // The filter panel is docked at the right edge; reserve its width so
          // page content narrows instead of disappearing behind it.
          marginRight: `calc(10px + var(${FILTER_PANEL_WIDTH_VAR}, 0px))`,
          marginBottom: 10,
          transition: "margin-left 200ms, margin-right 225ms",
        }}
      >
        {children}
      </main>
    </>
  );
}
