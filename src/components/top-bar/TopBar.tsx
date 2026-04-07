"use client";

import { isActive, navLinks } from "@/components/nav/navLinks";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdMenu } from "react-icons/md";
import LoginComponent from "./LoginComponent";
import SplMaintenanceIndicator from "./SplMaintenanceIndicator";
import ThemeToggle from "./ThemeToggle";

export const APP_BAR_HEIGHT = 64;

const MOBILE_NAV_COUNT = 3;

interface TopBarProps {
  onHamburgerClick: () => void;
}

export default function TopBar({ onHamburgerClick }: Readonly<TopBarProps>) {
  const pathname = usePathname();

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={1}
      sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
    >
      <Toolbar sx={{ gap: 0.5, px: 1, minHeight: APP_BAR_HEIGHT + "px !important" }}>
        {/* Hamburger */}
        <IconButton
          onClick={onHamburgerClick}
          aria-label="Toggle navigation"
          color="inherit"
          size="small"
        >
          <MdMenu size={20} />
        </IconButton>

        {/* Logo */}
        <Link
          suppressHydrationWarning
          href="/"
          style={{
            textDecoration: "none",
            color: "inherit",
            fontWeight: "bold",
            fontSize: "1.125rem",
            flexShrink: 0,
            paddingInline: 4,
          }}
        >
          SPL Stats
        </Link>

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Mobile: first 3 nav icons */}
        <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 0.5 }}>
          {navLinks.slice(0, MOBILE_NAV_COUNT).map(({ href, label, icon }) => (
            <Link
              key={href}
              suppressHydrationWarning
              href={href}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Tooltip title={label}>
                <IconButton
                  suppressHydrationWarning
                  size="small"
                  color={isActive(href, pathname) ? "primary" : "default"}
                >
                  {icon}
                </IconButton>
              </Tooltip>
            </Link>
          ))}
        </Box>

        {/* Right side: maintenance indicator + theme + user */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <SplMaintenanceIndicator />
          <ThemeToggle />
          <LoginComponent />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
