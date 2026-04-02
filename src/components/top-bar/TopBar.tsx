"use client";

import MenuIcon from "@mui/icons-material/Menu";
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GiChest } from "react-icons/gi";
import { MdAdminPanelSettings, MdDashboard, MdHome, MdPeople } from "react-icons/md";
import LoginComponent from "./LoginComponent";
import ThemeToggle from "./ThemeToggle";

/** Height of the fixed AppBar — import this constant anywhere you need a sticky top offset. */
export const APP_BAR_HEIGHT = 64;

const navLinks = [
  { href: "/", label: "Home", icon: <MdHome size={20} /> },
  { href: "/jackpot-prizes", label: "Jackpot Prizes", icon: <GiChest size={20} /> },
  { href: "/multi-dashboard", label: "Multi Dashboard", icon: <MdDashboard size={20} /> },
  { href: "/users", label: "Users", icon: <MdPeople size={20} /> },
  { href: "/admin", label: "Admin", icon: <MdAdminPanelSettings size={20} /> },
];

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function TopBar() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppBar
        position="fixed"
        color="default"
        elevation={1}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar sx={{ minHeight: `${APP_BAR_HEIGHT}px !important`, gap: 1 }}>
          {/* Logo */}
          <Typography
            suppressHydrationWarning
            variant="h6"
            fontWeight={700}
            component={Link}
            href="/"
            sx={{ textDecoration: "none", color: "inherit", flexShrink: 0, mr: 2 }}
          >
            SPL Stats
          </Typography>

          {/* Desktop nav links */}
          {!isMobile && (
            <Box sx={{ display: "flex", gap: 0.5, flex: 1, alignItems: "center" }}>
              {navLinks.map((link) => {
                const active = isActive(link.href, pathname);
                return (
                  <Button
                    key={link.href}
                    suppressHydrationWarning
                    component={Link}
                    href={link.href}
                    sx={{
                      textTransform: "none",
                      color: active ? "primary.main" : "text.primary",
                      fontWeight: active ? 700 : 400,
                      borderBottom: "2px solid",
                      borderColor: active ? "primary.main" : "transparent",
                      borderRadius: 0,
                      px: 1.5,
                      pb: 0.5,
                    }}
                  >
                    {link.label}
                  </Button>
                );
              })}
            </Box>
          )}

          {/* Spacer on mobile */}
          {isMobile && <Box sx={{ flex: 1 }} />}

          {/* Right side: always visible */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ThemeToggle />
            <LoginComponent />
          </Box>

          {/* Mobile hamburger */}
          {isMobile && (
            <IconButton
              sx={{ ml: 0.5 }}
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 260 } } }}
      >
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            SPL Stats
          </Typography>
        </Box>
        <Divider />
        <List>
          {navLinks.map((link) => {
            const active = isActive(link.href, pathname);
            return (
              <ListItem key={link.href} disablePadding>
                <ListItemButton
                  suppressHydrationWarning
                  component={Link}
                  href={link.href}
                  selected={active}
                  onClick={() => setDrawerOpen(false)}
                  sx={{
                    borderRadius: 1,
                    mx: 1,
                    "&.Mui-selected": { bgcolor: "action.selected" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{link.icon}</ListItemIcon>
                  <ListItemText
                    primary={link.label}
                    slotProps={{ primary: { fontWeight: active ? 700 : 400 } }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
    </>
  );
}
