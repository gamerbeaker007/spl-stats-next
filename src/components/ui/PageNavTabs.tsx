"use client";

import GlowingTab from "@/components/ui/GlowingTab";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tabs from "@mui/material/Tabs";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

export interface PageNavTab {
  label: string;
  /** Provide for route-based navigation. Omit when using controlled mode. */
  href?: string;
  icon?: React.ReactNode;
}

interface PageNavTabsProps {
  tabs: PageNavTab[];
  /** Controlled mode: current active index. Leave undefined for route mode. */
  value?: number;
  /** Controlled mode: called when user selects a tab. Leave undefined for route mode. */
  onChange?: (index: number) => void;
}

export default function PageNavTabs({ tabs, value, onChange }: PageNavTabsProps) {
  const isMobile = useMediaQuery("(max-width:600px)");
  const pathname = usePathname();
  const router = useRouter();

  const isRouteMode = tabs.some((t) => t.href !== undefined);

  // Route mode: find active tab by longest matching href first (more specific wins).
  const routeActiveIndex = isRouteMode
    ? ([...tabs.map((t, i) => ({ t, i }))]
        .sort((a, b) => (b.t.href?.length ?? 0) - (a.t.href?.length ?? 0))
        .find(({ t }) => {
          if (!t.href) return false;
          return pathname === t.href || pathname.startsWith(t.href + "/");
        })?.i ?? 0)
    : 0;

  const activeIndex = isRouteMode ? routeActiveIndex : (value ?? 0);

  const handleChange = (idx: number) => {
    if (isRouteMode) {
      const href = tabs[idx]?.href;
      if (href) router.push(href);
    } else {
      onChange?.(idx);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isMobile ? "flex-start" : "center",
        position: "sticky",
        top: 0,
        zIndex: 1100,
        borderBottom: `1px solid var(--mui-palette-divider)`,
        backgroundColor: "var(--mui-palette-background-default)",
      }}
    >
      {isMobile ? (
        <Box sx={{ px: 1, py: 0.75 }}>
          <Select
            value={activeIndex}
            onChange={(e) => handleChange(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 180 }}
          >
            {tabs.map((tab, i) => (
              <MenuItem key={i} value={i}>
                {tab.icon && (
                  <Box
                    component="span"
                    sx={{ mr: 1, display: "inline-flex", verticalAlign: "middle" }}
                  >
                    {tab.icon}
                  </Box>
                )}
                {tab.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
      ) : (
        <Tabs
          value={activeIndex}
          onChange={(_, idx) => handleChange(idx)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 36,
          }}
        >
          {tabs.map((tab, i) => (
            <GlowingTab
              key={i}
              label={tab.label}
              icon={tab.icon as React.ReactElement | undefined}
              iconPosition="start"
            />
          ))}
        </Tabs>
      )}
    </Box>
  );
}
