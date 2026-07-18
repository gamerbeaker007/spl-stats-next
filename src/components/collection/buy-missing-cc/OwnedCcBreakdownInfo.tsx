"use client";

import type { OwnedCcBreakdown } from "@/lib/shared/buy-missing-cc";
import { Box, Tooltip, Typography } from "@mui/material";
import { MdInfoOutline } from "react-icons/md";

interface OwnedCcBreakdownInfoProps {
  breakdown: OwnedCcBreakdown;
}

/**
 * Small info icon shown next to a "Total CC" value when part of the owned BCX is
 * currently unavailable — delegated out or listed on the marketplace. The player
 * still owns those copies, but they cannot all be used freely. Renders nothing
 * when none of the owned BCX is delegated or listed.
 */
export default function OwnedCcBreakdownInfo({ breakdown }: Readonly<OwnedCcBreakdownInfoProps>) {
  const { total, delegated, listed } = breakdown;
  if (delegated <= 0 && listed <= 0) return null;

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="caption" component="div">
            Total owned CC: {total}
          </Typography>
          {delegated > 0 && (
            <Typography variant="caption" component="div">
              Delegated CC: {delegated}
            </Typography>
          )}
          {listed > 0 && (
            <Typography variant="caption" component="div">
              Listed CC: {listed}
            </Typography>
          )}
        </Box>
      }
    >
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          ml: 0.5,
          color: "text.secondary",
          verticalAlign: "middle",
        }}
      >
        <MdInfoOutline size={14} />
      </Box>
    </Tooltip>
  );
}
