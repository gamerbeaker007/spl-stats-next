"use client";

import { isActive, navLinks } from "@/components/nav/navLinks";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MdMenu } from "react-icons/md";
import { MdFavorite } from "react-icons/md";
import InvalidTokenAlert from "./InvalidTokenAlert";
import LoginComponent from "./LoginComponent";
import SplMaintenanceIndicator from "./SplMaintenanceIndicator";
import SupportDialog from "@/components/support/SupportDialog";
import ThemeToggle from "./ThemeToggle";

export const APP_BAR_HEIGHT = 50;

const MOBILE_NAV_COUNT = 3;

interface TopBarProps {
  onHamburgerClick: () => void;
}

export default function TopBar({ onHamburgerClick }: Readonly<TopBarProps>) {
  const pathname = usePathname();
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={1}
      sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
    >
      <Toolbar sx={{ gap: 0.5, px: 0, minHeight: APP_BAR_HEIGHT + "px !important" }}>
        {/* Hamburger */}
        <IconButton
          onClick={onHamburgerClick}
          aria-label="Toggle navigation"
          color="inherit"
          size="small"
          sx={{ ml: { xs: "0px", md: "-18px" } }}
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

        {/* Mobile: first x nav icons */}
        <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 0.5 }}>
          {navLinks.slice(1, MOBILE_NAV_COUNT).map(({ href, label, icon }) => (
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

        {/* Right side: maintenance indicator + invalid token alert + theme + user */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <SplMaintenanceIndicator />
          <InvalidTokenAlert />
          <ThemeToggle />
          <Tooltip title="Support / Donate">
            <IconButton
              size="small"
              color="error"
              aria-label="Open support and donation dialog"
              onClick={() => setSupportOpen(true)}
            >
              <MdFavorite size={18} />
            </IconButton>
          </Tooltip>
          <LoginComponent />
        </Box>
      </Toolbar>

      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
    </AppBar>
  );
}
