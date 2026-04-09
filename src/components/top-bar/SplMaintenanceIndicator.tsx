"use client";

import { getSplMaintenanceStatus } from "@/lib/backend/actions/spl-status";
import { IconButton, Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import { MdWarningAmber } from "react-icons/md";

export default function SplMaintenanceIndicator() {
  const [inMaintenance, setInMaintenance] = useState(false);

  useEffect(() => {
    getSplMaintenanceStatus().then(({ maintenance }) => setInMaintenance(maintenance));
  }, []);

  if (!inMaintenance) return null;

  return (
    <Tooltip title="Splinterlands is in maintenance — live data may be unavailable or outdated">
      <IconButton size="small" color="warning" aria-label="Splinterlands maintenance warning">
        <MdWarningAmber size={20} />
      </IconButton>
    </Tooltip>
  );
}
