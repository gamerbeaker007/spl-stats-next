"use client";

import { useMarketplaceView } from "@/lib/frontend/context/MarketplaceViewContext";
import { ToggleButton, ToggleButtonGroup, Tooltip } from "@mui/material";
import { MdViewList, MdViewModule } from "react-icons/md";

/** Card/table layout switch for marketplace pages. Persists via MarketplaceViewContext. */
export default function MarketViewToggle() {
  const { viewMode, setViewMode } = useMarketplaceView();

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={viewMode}
      onChange={(_event, next) => {
        if (next === "card" || next === "table") setViewMode(next);
      }}
    >
      <ToggleButton value="card" aria-label="Card view">
        <Tooltip title="Card view">
          <MdViewModule size={18} />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="table" aria-label="Table view">
        <Tooltip title="Table view">
          <MdViewList size={18} />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
