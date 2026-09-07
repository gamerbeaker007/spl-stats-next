"use client";

import type { RunTxOptions } from "@/hooks/collection/useMarketplaceTransaction";
import { buildSkinActivationTx } from "@/lib/frontend/purchase/skin-activation";
import {
  getActivateTooltip,
  getActualOwnedQuantity,
  getCurrentlyListedQuantity,
  isSkinActivateDisabled,
  isSkinActive,
} from "@/lib/shared/marketplace-assets";
import type { MarketplaceAssetItem } from "@/types/marketplace-assets";
import { Box, Button, Tooltip } from "@mui/material";
import { MdCheckCircle } from "react-icons/md";

interface SkinActivateButtonProps {
  account: string;
  item: MarketplaceAssetItem;
  /** The host dialog's transaction runner — progress and errors surface there. */
  run: (options: RunTxOptions) => Promise<void>;
  /** True while that dialog is running any transaction. */
  busy: boolean;
  /** Extra block from the host dialog (e.g. its data is known to be stale). */
  disabled?: boolean;
  /** Tooltip explaining `disabled` — shown instead of the ownership tooltip. */
  disabledReason?: string;
}

/**
 * Activate action for a skin, usable from inside another dialog: it broadcasts
 * through the host dialog's own transaction runner, so the existing progress
 * panel and error alert report it — no second dialog. Renders nothing for
 * non-skin assets, and shares its gating and tooltip with the asset card.
 */
export default function SkinActivateButton({
  account,
  item,
  run,
  busy,
  disabled = false,
  disabledReason,
}: Readonly<SkinActivateButtonProps>) {
  if (item.assetName !== "SKINS") return null;

  const active = isSkinActive(item);
  const tooltip =
    disabled && disabledReason
      ? disabledReason
      : getActivateTooltip(
          item.assetName,
          getActualOwnedQuantity(item),
          getCurrentlyListedQuantity(item),
          active
        );

  return (
    <Tooltip title={tooltip}>
      <Box sx={{ display: "inline-flex" }}>
        <Button
          variant="outlined"
          color={active ? "success" : "primary"}
          disabled={busy || disabled || isSkinActivateDisabled(item)}
          onClick={() => run(buildSkinActivationTx(account, item))}
          startIcon={<MdCheckCircle />}
        >
          Activate
        </Button>
      </Box>
    </Tooltip>
  );
}
