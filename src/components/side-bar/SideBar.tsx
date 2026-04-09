"use client";

import { isActive, navLinks } from "@/components/nav/navLinks";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = 240;

interface NavSidebarProps {
  expanded: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavList({ expanded, onNavigate }: { expanded: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <List disablePadding>
      {navLinks.map(({ href, label, icon }) => {
        const active = isActive(href, pathname);
        const button = (
          <ListItem disablePadding key={href}>
            <Link
              suppressHydrationWarning
              href={href}
              onClick={onNavigate}
              style={{ textDecoration: "none", color: "inherit", width: "100%" }}
            >
              <ListItemButton
                selected={active}
                sx={{
                  minHeight: 48,
                  justifyContent: expanded ? "initial" : "center",
                  px: expanded ? 2 : 1,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: expanded ? 2 : "auto",
                    justifyContent: "center",
                    color: active ? "primary.main" : "text.secondary",
                  }}
                >
                  {icon}
                </ListItemIcon>
                {expanded && (
                  <ListItemText
                    primary={label}
                    slotProps={{
                      primary: {
                        variant: "body2",
                        fontWeight: active ? "bold" : "normal",
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </Link>
          </ListItem>
        );

        return expanded ? (
          button
        ) : (
          <Tooltip key={href} title={label} placement="right" arrow>
            {button}
          </Tooltip>
        );
      })}
    </List>
  );
}

const drawerPaperSx = (width: number) => ({
  width,
  top: APP_BAR_HEIGHT,
  height: `calc(100% - ${APP_BAR_HEIGHT}px)`,
  overflowX: "hidden",
  boxSizing: "border-box",
});

export default function NavSidebar({ expanded, mobileOpen, onMobileClose }: NavSidebarProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{ zIndex: (t) => t.zIndex.appBar + 1 }}
        PaperProps={{ sx: drawerPaperSx(EXPANDED_WIDTH) }}
      >
        <Suspense>
          <NavList expanded={true} onNavigate={onMobileClose} />
        </Suspense>
      </Drawer>
    );
  }

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        position: "fixed",
        left: 0,
        bottom: 0,
        top: APP_BAR_HEIGHT,
        width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        overflowX: "hidden",
        transition: "width 200ms",
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        zIndex: (t) => t.zIndex.drawer,
      }}
    >
      <Suspense>
        <NavList expanded={expanded} />
      </Suspense>
    </Box>
  );
}
