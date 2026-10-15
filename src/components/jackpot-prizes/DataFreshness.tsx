"use client";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { Box, Tooltip } from "@mui/material";
import { useSyncExternalStore } from "react";

interface Props {
  timestamp: string | number | null | undefined;
  source: "browser" | "server-cache" | "database";
  provider?: string;
}

function subscribeToTimezoneChanges() {
  return () => {};
}

function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function DataFreshness({ timestamp, source, provider }: Props) {
  const timezone = useSyncExternalStore(subscribeToTimezoneChanges, getBrowserTimezone, () => null);
  if (timestamp === null || timestamp === undefined) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  const formattedTime = timezone
    ? new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date)
    : "";
  const tooltip =
    source === "database"
      ? `Checked against this site's database${formattedTime ? ` at ${formattedTime}` : ""}.`
      : source === "server-cache"
        ? `This site's server-cached data was last fetched from ${provider ?? "its source"}${formattedTime ? ` at ${formattedTime}` : ""}.`
        : `Your browser fetched this directly from ${provider ?? "its source"}${formattedTime ? ` at ${formattedTime}` : ""}.`;

  return (
    <Box component="span" sx={{ display: "inline-flex", verticalAlign: "middle" }}>
      <Tooltip title={tooltip}>
        <AccessTimeIcon
          aria-label={tooltip}
          role="img"
          tabIndex={0}
          sx={{ color: "text.secondary", fontSize: "1rem", cursor: "help" }}
        />
      </Tooltip>
    </Box>
  );
}
