"use client";

import type { LandCartState } from "@/hooks/land-market/useLandCart";
import { Button, IconButton, Tooltip } from "@mui/material";
import { MdAddShoppingCart, MdRemoveShoppingCart } from "react-icons/md";

interface LandCartButtonProps {
  state: LandCartState;
  location: string;
  onToggle: () => void;
  /** `icon` for dense table rows, `full` for grid cards. */
  variant?: "icon" | "full";
}

/** Add/remove one land listing to/from the shared purchase cart. */
export default function LandCartButton({
  state,
  location,
  onToggle,
  variant = "full",
}: Readonly<LandCartButtonProps>) {
  const inCart = state.inCartFor !== null;
  const disabled = !inCart && state.blockedReason !== null;
  const tooltip = inCart
    ? `In cart for ${state.inCartFor} — click to remove`
    : (state.blockedReason ?? "Add to cart");
  const ariaLabel = inCart ? `Remove ${location} from cart` : `Add ${location} to cart`;

  return (
    <Tooltip title={tooltip}>
      {/* Span keeps the tooltip working while the button is disabled. */}
      <span>
        {variant === "icon" ? (
          <IconButton
            size="small"
            color={inCart ? "success" : "primary"}
            disabled={disabled}
            onClick={onToggle}
            aria-label={ariaLabel}
            aria-pressed={inCart}
          >
            {inCart ? <MdRemoveShoppingCart size={18} /> : <MdAddShoppingCart size={18} />}
          </IconButton>
        ) : (
          <Button
            size="small"
            variant={inCart ? "outlined" : "contained"}
            color={inCart ? "success" : "primary"}
            disabled={disabled}
            onClick={onToggle}
            aria-label={ariaLabel}
            aria-pressed={inCart}
            startIcon={
              inCart ? <MdRemoveShoppingCart size={16} /> : <MdAddShoppingCart size={16} />
            }
            sx={{ textTransform: "none", whiteSpace: "nowrap" }}
          >
            {inCart ? "In Cart" : "Add to Cart"}
          </Button>
        )}
      </span>
    </Tooltip>
  );
}
