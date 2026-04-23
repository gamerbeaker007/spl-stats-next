"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MdExpandMore, MdClose, MdMenu } from "react-icons/md";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import {
  conclave_icon_url,
  escalation_icon_url,
  frontier_icon_url,
  jackpot_icon_url,
  land_icon_url,
  ranked_icon_url,
} from "@/lib/staticsIconUrls";

const BASE = "/jackpot-prizes";

const iconMap = {
  conclave: conclave_icon_url,
  escalation: escalation_icon_url,
  jackpot: jackpot_icon_url,
  frontier: frontier_icon_url,
  ranked: ranked_icon_url,
  land: land_icon_url,
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
  alt: string;
  color?: string;
}

const mintHistory: NavItem[] = [
  {
    label: "CA Mint History",
    href: `${BASE}/ca-mint-history`,
    icon: iconMap.conclave,
    alt: "Conclave Arcana",
  },
  {
    label: "Escalation Mint History",
    href: `${BASE}/escalation-mint-history`,
    icon: iconMap.escalation,
    alt: "Escalation",
  },
  {
    label: "Land Mint History",
    href: `${BASE}/land-mint-history`,
    icon: iconMap.land,
    alt: "Land",
  },
  {
    label: "Ranked Reward Draws",
    href: `${BASE}/ranked-reward-draws`,
    icon: iconMap.ranked,
    alt: "Ranked Draws",
  },
  {
    label: "Frontier Reward Draws",
    href: `${BASE}/frontier-reward-draws`,
    icon: iconMap.frontier,
    alt: "Frontier Draws",
  },
];

const jackpotPrizes: NavItem[] = [
  {
    label: "Jackpot Prizes",
    href: `${BASE}/jackpot-prizes-chests`,
    icon: iconMap.jackpot,
    alt: "Jackpot",
  },
  {
    label: "Jackpot CA Gold Rewards",
    href: `${BASE}/ca-gold-rewards`,
    icon: iconMap.conclave,
    alt: "CA Gold Rewards",
    color: "#FFD700",
  },
];

function NavDropdown({
  label,
  items,
  activeRoutes,
  pathname,
}: Readonly<{
  label: string;
  items: NavItem[];
  activeRoutes: string[];
  pathname: string;
}>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const isActive = activeRoutes.includes(pathname);

  return (
    <>
      <Button
        suppressHydrationWarning
        onClick={(e) => setAnchorEl(e.currentTarget)}
        color={isActive ? "secondary" : "inherit"}
        variant={isActive ? "outlined" : "text"}
        endIcon={
          <MdExpandMore
            style={{
              transition: "transform 200ms",
              transform: open ? "rotate(180deg)" : undefined,
            }}
          />
        }
        size="small"
      >
        {label}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { elevation: 4, sx: { minWidth: 220, mt: 0.5 } } }}
      >
        {items.map((item, idx) => (
          <Box key={item.href}>
            {idx > 0 && <Divider />}
            <MenuItem
              component={Link}
              href={item.href}
              suppressHydrationWarning
              selected={pathname === item.href}
              onClick={() => setAnchorEl(null)}
              sx={{ gap: 1.5, color: item.color ?? "inherit" }}
            >
              <Image src={item.icon} alt={item.alt} width={22} height={22} />
              {item.label}
            </MenuItem>
          </Box>
        ))}
      </Menu>
    </>
  );
}

const allGroups: { title: string; items: NavItem[] }[] = [
  { title: "Mint History", items: mintHistory },
  { title: "Jackpot Prizes", items: jackpotPrizes },
];

export default function JackpotNavigation() {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{
        top: APP_BAR_HEIGHT,
        zIndex: (t) => t.zIndex.appBar - 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        mb: 2,
      }}
    >
      <Toolbar
        variant="dense"
        sx={{ justifyContent: isMobile ? "space-between" : "center", gap: 1, flexWrap: "wrap" }}
      >
        {isMobile ? (
          <>
            <Link
              suppressHydrationWarning
              href={BASE}
              style={{ textDecoration: "none", color: "inherit", fontWeight: "bold" }}
            >
              SPL Jackpot Prizes
            </Link>
            <IconButton
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              color="inherit"
              size="small"
            >
              <MdMenu size={20} />
            </IconButton>
          </>
        ) : (
          <>
            <NavDropdown
              label="Mint History"
              items={mintHistory}
              activeRoutes={mintHistory.map((i) => i.href)}
              pathname={pathname}
            />
            <NavDropdown
              label="Jackpot Prizes"
              items={jackpotPrizes}
              activeRoutes={jackpotPrizes.map((i) => i.href)}
              pathname={pathname}
            />
          </>
        )}
      </Toolbar>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: 270, top: APP_BAR_HEIGHT, height: `calc(100% - ${APP_BAR_HEIGHT}px)` },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>SPL Jackpot Prizes</span>
          <IconButton
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
            sx={{ color: "inherit" }}
            size="small"
          >
            <MdClose size={18} />
          </IconButton>
        </Box>

        <Divider />

        <List sx={{ overflowY: "auto", flex: 1 }}>
          {allGroups.map((group) => (
            <Box key={group.title}>
              <ListSubheader sx={{ lineHeight: "32px", mt: 1 }}>{group.title}</ListSubheader>
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <ListItem key={item.href} disablePadding sx={{ mx: 0.5 }}>
                    <ListItemButton
                      component={Link}
                      href={item.href}
                      suppressHydrationWarning
                      selected={active}
                      onClick={() => setDrawerOpen(false)}
                      sx={{ borderRadius: 1, color: item.color ?? "inherit" }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Image src={item.icon} alt={item.alt} width={22} height={22} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: { variant: "body2", fontWeight: active ? "bold" : "normal" },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
              <Divider sx={{ mt: 1 }} />
            </Box>
          ))}
        </List>
      </Drawer>
    </AppBar>
  );
}
