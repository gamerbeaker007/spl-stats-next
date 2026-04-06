"use client";

import NavSidebar from "@/components/side-bar/SideBar";
import TopBar, { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import React, { Suspense, useState } from "react";

const SIDEBAR_COLLAPSED_WIDTH = 56;
const SIDEBAR_EXPANDED_WIDTH = 240;

export default function NavShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
        style={{
          paddingTop: APP_BAR_HEIGHT,
          marginTop: 10,
          marginLeft: determineSidebarWidth() + 10,
          marginRight: 10,
          marginBottom: 10,
          transition: "margin-left 200ms",
        }}
      >
        {children}
      </main>
    </>
  );
}
