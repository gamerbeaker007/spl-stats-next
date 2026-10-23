"use client";

import { Box, Tooltip, Typography } from "@mui/material";
import { MdInfoOutline } from "react-icons/md";

/**
 * Explains why the upgrade estimates are a lower bound: they multiply the
 * missing CC by the cheapest price per CC, which is only available when buying
 * that exact listing as a whole.
 */
export default function EstimateInfo() {
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="caption" component="div">
            Estimates use the lowest price per CC on the market, so they are the lowest possible
            cost (a best case).
          </Typography>
          <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
            That price comes from one specific listing, which can hold more CC than you need. E.g.
            needing 20 CC at $0.775/CC estimates $15.50, but if the cheapest listing is a 60 CC card
            for $46.49, buying exactly 20 CC at that rate is not possible.
          </Typography>
          <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
            Open the buy dialog to see the actual listings and real cost.
          </Typography>
        </Box>
      }
    >
      <Box
        component="span"
        sx={{ display: "inline-flex", alignItems: "center", color: "text.secondary" }}
      >
        <MdInfoOutline size={14} />
      </Box>
    </Tooltip>
  );
}
