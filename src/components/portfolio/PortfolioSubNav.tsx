"use client";

import { Box, Tab, Tabs } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { MdAccountBalance, MdGridView, MdInventory2 } from "react-icons/md";

interface PortfolioNavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number }>;
}

const PORTFOLIO_NAV_ITEMS: PortfolioNavItem[] = [
  { label: "Portfolio", href: "/portfolio", icon: MdAccountBalance },
  { label: "Card Collection", href: "/portfolio/collection", icon: MdGridView },
  { label: "Inventory", href: "/portfolio/inventory", icon: MdInventory2 },
];

/** Tabs between the portfolio sub-pages. */
export default function PortfolioSubNav() {
  const pathname = usePathname();
  const activeHref =
    PORTFOLIO_NAV_ITEMS.find((item) => item.href !== "/portfolio" && pathname.startsWith(item.href))
      ?.href ?? (pathname === "/portfolio" ? "/portfolio" : false);

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
      <Tabs value={activeHref} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
        {PORTFOLIO_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Tab
              suppressHydrationWarning
              key={item.href}
              value={item.href}
              component={Link}
              href={item.href}
              icon={<Icon size={20} />}
              iconPosition="start"
              label={item.label}
              sx={{ minHeight: 48, textTransform: "none" }}
            />
          );
        })}
      </Tabs>
    </Box>
  );
}
