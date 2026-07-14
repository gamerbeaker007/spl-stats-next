"use client";

import { Box, Tab, Tabs } from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  MdAddShoppingCart,
  MdBrush,
  MdEmojiEvents,
  MdGridView,
  MdMusicNote,
  MdScience,
  MdShoppingBag,
  MdStyle,
  MdTerrain,
  MdViewInAr,
} from "react-icons/md";

interface CollectionNavItem {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number }>;
}

export const COLLECTION_NAV_ITEMS: CollectionNavItem[] = [
  { label: "Cards", href: "/collection/cards", icon: MdGridView },
  { label: "Buy Missing CC", href: "/collection/buy-missing-cc", icon: MdAddShoppingCart },
  { label: "Skins", href: "/collection/skins", icon: MdBrush },
  { label: "Music", href: "/collection/music", icon: MdMusicNote },
  { label: "Packs", href: "/collection/packs", icon: MdShoppingBag },
  { label: "Titles", href: "/collection/titles", icon: MdEmojiEvents },
  { label: "Consumables", href: "/collection/consumables", icon: MdScience },
  { label: "Collector Stickers", href: "/collection/collector-stickers", icon: MdStyle },
  { label: "Totems", href: "/collection/totems", icon: MdViewInAr },
  { label: "Land", href: "/collection/land", icon: MdTerrain },
];

/** Sub-navigation shown on every /collection page so users can jump between sections. */
export default function CollectionSubNav() {
  const pathname = usePathname();

  // Longest matching href wins so /collection/buy-missing-cc doesn't match /collection.
  const activeHref =
    COLLECTION_NAV_ITEMS.map((item) => item.href)
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? false;

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
      <Tabs value={activeHref} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
        {COLLECTION_NAV_ITEMS.map((item) => {
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
