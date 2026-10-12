"use client";

import {
  FILTER_PANEL_MOBILE_QUERY,
  FILTER_PANEL_WIDTH,
  FILTER_PANEL_WIDTH_VAR,
} from "@/components/shared/filter/filterPanelLayout";
import { APP_BAR_HEIGHT } from "@/components/top-bar/TopBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, type ReactNode } from "react";
import { MdClose, MdFilterList, MdRestartAlt } from "react-icons/md";

interface FilterPanelShellProps {
  open: boolean;
  onToggle: () => void;
  onReset: () => void;
  /** Number of active filters — badges the header and the floating open button. */
  activeCount: number;
  ariaLabel?: string;
  children: ReactNode;
}

/**
 * Chrome for the right-hand filter side panel: docked on desktop (publishes its
 * width so `NavShell` narrows `main`), an overlay drawer on mobile, with a
 * sticky header (active count, reset, close) and a floating open button.
 * Filter controls are passed as children.
 */
export default function FilterPanelShell({
  open,
  onToggle,
  onReset,
  activeCount,
  ariaLabel = "Filter",
  children,
}: Readonly<FilterPanelShellProps>) {
  const isMobile = useMediaQuery(FILTER_PANEL_MOBILE_QUERY);

  // Docked only on desktop: there the panel is a real side panel and `main`
  // narrows around it. On mobile it stays an overlay drawer — there is no room
  // to dock without squeezing the content to nothing.
  const docked = !isMobile && open;

  // The open state is persisted, so a session that ended docked on desktop
  // would otherwise reopen as a full-screen modal overlay on a phone.
  useEffect(() => {
    if (isMobile && open) onToggle();
    // Only react to the breakpoint — reopening on mobile is a deliberate user action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Publish the docked width so `NavShell` can reserve room for the panel.
  // Reset to 0 on unmount, otherwise leaving a filtered page would leave `main`
  // permanently indented.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(FILTER_PANEL_WIDTH_VAR, docked ? `${FILTER_PANEL_WIDTH}px` : "0px");
    return () => root.style.setProperty(FILTER_PANEL_WIDTH_VAR, "0px");
  }, [docked]);

  const drawerContent = (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
      role="complementary"
      aria-label={ariaLabel}
    >
      {/* Sticky header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          bgcolor: "background.paper",
          zIndex: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <MdFilterList size={18} />
          <Typography variant="subtitle1" fontWeight={600}>
            Filter
          </Typography>
          {activeCount > 0 && (
            <Typography
              variant="caption"
              sx={{
                px: 0.75,
                py: 0.125,
                borderRadius: 10,
                bgcolor: "error.main",
                color: "error.contrastText",
                fontWeight: 700,
                lineHeight: 1.6,
              }}
            >
              {activeCount}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Reset filter">
            <IconButton size="small" onClick={onReset} aria-label="Reset filter">
              <MdRestartAlt size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close filter">
            <IconButton size="small" onClick={onToggle} aria-label="Close filter">
              <MdClose size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box sx={{ p: 1.5, flex: 1 }}>{children}</Box>
    </Box>
  );

  return (
    <>
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        anchor="right"
        open={open}
        onClose={onToggle}
        sx={{
          // The docked panel must not claim layout width here — it is fixed
          // positioned, and `NavShell` reserves the space on `main` instead.
          width: 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isMobile ? `min(88vw, ${FILTER_PANEL_WIDTH}px)` : FILTER_PANEL_WIDTH,
            boxSizing: "border-box",
            top: APP_BAR_HEIGHT,
            height: `calc(100% - ${APP_BAR_HEIGHT}px)`,
            border: "none",
            borderLeft: 1,
            borderColor: "divider",
            backgroundImage: "none",
          },
        }}
        ModalProps={{ keepMounted: true }}
      >
        {drawerContent}
      </Drawer>

      {!open && (
        <Tooltip
          title={activeCount > 0 ? `Open filter (${activeCount} active)` : "Open filter"}
          placement="left"
        >
          {/* The Badge carries the fixed positioning: anchoring it on the button
              instead would place the counter relative to a static box, and at
              right: 0 it would be clipped off the edge of the viewport. */}
          <Badge
            badgeContent={activeCount}
            color="primary"
            overlap="circular"
            anchorOrigin={{ vertical: "top", horizontal: "left" }}
            sx={{
              position: "fixed",
              right: 0,
              top: `${APP_BAR_HEIGHT + 70}px`,
              zIndex: 1200,
              "& .MuiBadge-badge": {
                border: "2px solid",
                borderColor: "background.default",
              },
            }}
          >
            <IconButton
              aria-label={activeCount > 0 ? `Open filter, ${activeCount} active` : "Open filter"}
              onClick={onToggle}
              sx={{
                bgcolor: "error.main",
                color: "#fff",
                borderRadius: "4px 0 0 4px",
                border: 1,
                borderRight: 0,
                borderColor: "error.dark",
                "&:hover": { bgcolor: "error.dark" },
              }}
            >
              <MdFilterList size={24} />
            </IconButton>
          </Badge>
        </Tooltip>
      )}
    </>
  );
}
