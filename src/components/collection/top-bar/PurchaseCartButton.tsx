"use client";

import { usePurchasePlan } from "@/lib/frontend/context/PurchasePlanContext";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { MdShoppingCart } from "react-icons/md";

export default function PurchaseCartButton() {
  const { count, setCheckoutOpen } = usePurchasePlan();

  return (
    <Tooltip title={count > 0 ? `Purchase plan (${count})` : "Purchase plan is empty"}>
      <IconButton size="small" color="inherit" onClick={() => setCheckoutOpen(true)}>
        <Badge badgeContent={count} color="primary">
          <MdShoppingCart size={20} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
