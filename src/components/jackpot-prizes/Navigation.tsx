"use client";

import {
  conclave_icon_url,
  escalation_icon_url,
  frontier_icon_url,
  jackpot_icon_url,
  land_icon_url,
  ranked_icon_url,
} from "@/lib/utils/staticUrls";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuIcon from "@mui/icons-material/Menu";
import {
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
  ListSubheader,
  Menu,
  MenuItem,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MouseEvent, useState } from "react";

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
    href: `${BASE}/jackpot-prizes`,
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
}: {
  label: string;
  items: NavItem[];
  activeRoutes: string[];
  pathname: string;
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const open = Boolean(anchor);
  const isActive = activeRoutes.includes(pathname);

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const handleClose = () => setAnchor(null);

  return (
    <>
      <Button
        suppressHydrationWarning
        onClick={handleOpen}
        endIcon={
          <ExpandMoreIcon
            sx={{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}
          />
        }
        sx={{
          color: isActive ? "secondary.main" : "inherit",
          border: isActive ? "1px solid" : "1px solid transparent",
          borderColor: isActive ? "secondary.main" : "transparent",
          borderRadius: 2,
          textTransform: "none",
          fontWeight: isActive ? 700 : 400,
          px: 1.5,
        }}
      >
        {label}
      </Button>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 220,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
            },
          },
        }}
      >
        {items.map((item, idx) => (
          <Box key={item.href}>
            {idx > 0 && <Divider />}
            <MenuItem
              suppressHydrationWarning
              component={Link}
              href={item.href}
              onClick={handleClose}
              selected={pathname === item.href}
              sx={{
                gap: 1.5,
                py: 1,
                color: item.color ?? "inherit",
                "&.Mui-selected": { bgcolor: "action.selected" },
              }}
            >
              <Image src={item.icon} alt={item.alt} width={22} height={22} />
              <Typography variant="body2" fontWeight={pathname === item.href ? 700 : 400}>
                {item.label}
              </Typography>
            </MenuItem>
          </Box>
        ))}
      </Menu>
    </>
  );
}

export default function JackpotNavigation() {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allGroups: { title: string; items: NavItem[] }[] = [
    { title: "Mint History", items: mintHistory },
    { title: "Jackpot Prizes", items: jackpotPrizes },
  ];

  return (
    <Box
      component="nav"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1100,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        mb: 2,
      }}
    >
      {/* Desktop nav — items centered */}
      {!isMobile && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 0.5,
            flexWrap: "wrap",
            py: 1,
            px: 2,
          }}
        >
          <NavDropdown
            label="Mint History"
            items={mintHistory}
            activeRoutes={mintHistory.map((item) => item.href)}
            pathname={pathname}
          />
          <NavDropdown
            label="Jackpot Prizes"
            items={jackpotPrizes}
            activeRoutes={jackpotPrizes.map((item) => item.href)}
            pathname={pathname}
          />
        </Box>
      )}

      {/* Mobile — title left, hamburger right */}
      {isMobile && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 0.5,
            px: 1,
          }}
        >
          <Typography
            variant="subtitle1"
            suppressHydrationWarning
            component={Link}
            href={BASE}
            sx={{ fontWeight: 700, textDecoration: "none", color: "text.primary", pl: 1 }}
          >
            SPL Jackpot Prizes
          </Typography>
          <IconButton onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu">
            <MenuIcon />
          </IconButton>
        </Box>
      )}

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: { width: 270, bgcolor: "background.default" },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: "primary.main",
            color: "primary.contrastText",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            SPL Jackpot Prizes
          </Typography>
        </Box>

        <Divider />

        {allGroups.map((group) => (
          <List
            key={group.title}
            subheader={
              <ListSubheader
                sx={{
                  bgcolor: "transparent",
                  color: "text.secondary",
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  fontSize: "0.7rem",
                }}
              >
                {group.title}
              </ListSubheader>
            }
          >
            {group.items.map((item) => {
              const active = pathname === item.href;
              const isGold = !!item.color;
              return (
                <ListItem key={item.href} disablePadding>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    selected={active}
                    onClick={() => setDrawerOpen(false)}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      color: isGold ? item.color : "inherit",
                      "&.Mui-selected": { bgcolor: "action.selected", fontWeight: 700 },
                      "&:hover": isGold ? { color: "#FFD700" } : {},
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Image src={item.icon} alt={item.alt} width={22} height={22} />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{
                        primary: {
                          variant: "body2",
                          fontWeight: active ? 700 : 400,
                          color: isGold ? item.color : "inherit",
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
            <Divider sx={{ mt: 1 }} />
          </List>
        ))}
      </Drawer>
    </Box>
  );
}
