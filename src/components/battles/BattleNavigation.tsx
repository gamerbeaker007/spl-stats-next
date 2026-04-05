"use client";

import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Box from "@mui/material/Box";
import { usePathname, useRouter } from "next/navigation";
import { MdEmojiEvents, MdTrendingDown } from "react-icons/md";

const TABS = [
  { label: "Best Cards", href: "/battles", icon: <MdEmojiEvents size={18} /> },
  { label: "Losing Cards", href: "/battles/losing", icon: <MdTrendingDown size={18} /> },
] as const;

export default function BattleNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab: card detail page is not in tabs but highlights "Best Cards"
  const activeHref = pathname.startsWith("/battles/losing") ? "/battles/losing" : "/battles";

  const activeIndex = TABS.findIndex((t) => t.href === activeHref);

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
      <Tabs
        value={activeIndex >= 0 ? activeIndex : 0}
        onChange={(_, idx) => router.push(TABS[idx].href)}
        aria-label="Battle section navigation"
      >
        {TABS.map((tab) => (
          <Tab
            key={tab.href}
            label={tab.label}
            icon={tab.icon}
            iconPosition="start"
            sx={{ minHeight: 48, textTransform: "none", fontWeight: 500 }}
          />
        ))}
      </Tabs>
    </Box>
  );
}
