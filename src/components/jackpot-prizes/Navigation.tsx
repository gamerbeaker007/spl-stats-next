"use client";

import {
  JACKPOT_BASE,
  jackpotNavGroups,
  type JackpotNavGroup,
} from "@/components/jackpot-prizes/jackpot-nav-items";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MdClose, MdExpandMore, MdGridView, MdMenu } from "react-icons/md";

function NavDropdown({ group, pathname }: Readonly<{ group: JackpotNavGroup; pathname: string }>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const activeItem = group.items.find((i) => i.href === pathname);

  return (
    <>
      <Button
        suppressHydrationWarning
        onClick={(e) => setAnchorEl(e.currentTarget)}
        color={activeItem ? "secondary" : "inherit"}
        startIcon={<Box sx={{ display: "flex", fontSize: 18 }}>{group.icon}</Box>}
        endIcon={
          <MdExpandMore
            style={{
              transition: "transform 200ms",
              transform: open ? "rotate(180deg)" : undefined,
            }}
          />
        }
        size="small"
        sx={{
          textTransform: "none",
          fontWeight: activeItem ? 600 : 500,
          borderRadius: 5,
          px: 1.5,
          bgcolor: activeItem ? "action.selected" : undefined,
        }}
      >
        {group.title}
        {activeItem && (
          <Box
            component="span"
            sx={{ display: { xs: "none", lg: "inline" }, ml: 0.75, opacity: 0.8, fontWeight: 400 }}
          >
            · {activeItem.shortLabel}
          </Box>
        )}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        slotProps={{ paper: { elevation: 6, sx: { width: 360, mt: 1, borderRadius: 2 } } }}
      >
        {group.items.map((item) => (
          <MenuItem
            key={item.href}
            component={Link}
            href={item.href}
            suppressHydrationWarning
            selected={pathname === item.href}
            onClick={() => setAnchorEl(null)}
            sx={{ gap: 1.5, py: 1, mx: 0.5, borderRadius: 1, alignItems: "center" }}
          >
            <Box
              sx={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: 1.5,
                display: "grid",
                placeItems: "center",
                bgcolor: "action.hover",
              }}
            >
              <Image src={item.icon} alt={item.alt} width={24} height={24} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: item.color ?? "text.primary" }}
              >
                {item.label}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", whiteSpace: "normal", lineHeight: 1.3 }}
              >
                {item.description}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function JackpotNavigation() {
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The overview page already lists every section; no sub-nav needed there.
  if (pathname === JACKPOT_BASE) return null;

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
            <Box
              component={Link}
              suppressHydrationWarning
              href={JACKPOT_BASE}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                textDecoration: "none",
                color: "inherit",
                fontWeight: "bold",
              }}
            >
              <MdGridView size={18} />
              Jackpots &amp; Mints
            </Box>
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
            <Tooltip title="Overview">
              <IconButton
                component={Link}
                href={JACKPOT_BASE}
                suppressHydrationWarning
                aria-label="Jackpot overview"
                size="small"
                color="inherit"
              >
                <MdGridView size={18} />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
            {jackpotNavGroups.map((group) => (
              <NavDropdown key={group.key} group={group} pathname={pathname} />
            ))}
          </>
        )}
      </Toolbar>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: 290, top: APP_BAR_HEIGHT, height: `calc(100% - ${APP_BAR_HEIGHT}px)` },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Jackpots &amp; Mints
          </Typography>
          <IconButton
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
            size="small"
          >
            <MdClose size={18} />
          </IconButton>
        </Box>

        <Divider />

        <List sx={{ overflowY: "auto", flex: 1, py: 0.5 }}>
          <ListItem disablePadding sx={{ px: 0.5 }}>
            <ListItemButton
              component={Link}
              href={JACKPOT_BASE}
              suppressHydrationWarning
              onClick={() => setDrawerOpen(false)}
              sx={{ borderRadius: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <MdGridView size={20} />
              </ListItemIcon>
              <ListItemText primary="Overview" slotProps={{ primary: { variant: "body2" } }} />
            </ListItemButton>
          </ListItem>
          {jackpotNavGroups.map((group) => (
            <Box key={group.key}>
              <ListSubheader
                sx={{ display: "flex", alignItems: "center", gap: 1, lineHeight: "36px", mt: 1 }}
              >
                <Box sx={{ display: "flex", fontSize: 16 }}>{group.icon}</Box>
                {group.title}
              </ListSubheader>
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <ListItem key={item.href} disablePadding sx={{ px: 0.5 }}>
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
            </Box>
          ))}
        </List>
      </Drawer>
    </AppBar>
  );
}
