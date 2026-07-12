"use client";

import PurchaseTxProgressPanel from "@/components/collection/buy-card-dialog/PurchaseTxProgressPanel";
import type { DisplayRow } from "@/components/collection/buy-missing-cc/types";
import CombineLevelButton, {
  type CombineLevelButtonVm,
} from "@/components/collection/combine-card-dialog/CombineLevelButton";
import { broadcastCombineCards, waitForTransactions } from "@/lib/frontend/purchase/splBroadcast";
import {
  checkCombineStatus,
  getCardMaxLevel,
  getCombinableLevels,
  getCombineTooltipText,
  getNewAbilitiesAtLevel,
  selectCardsToCombine,
} from "@/lib/shared/buy-missing-cc";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { largeNumberFormat } from "@/lib/utils";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Image from "next/image";
import { useMemo, useState } from "react";
import { MdArrowForward } from "react-icons/md";
import { TbCopyPlusFilled } from "react-icons/tb";

interface CombineCardsDialogProps {
  open: boolean;
  account: string;
  card: DisplayRow;
  combineRates?: number[];
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  topOffsetPx?: number;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const withMessage = error as { message?: unknown; error?: unknown; reason?: unknown };
    if (typeof withMessage.message === "string" && withMessage.message.trim()) {
      return withMessage.message;
    }
    if (typeof withMessage.error === "string" && withMessage.error.trim()) {
      return withMessage.error;
    }
    if (typeof withMessage.reason === "string" && withMessage.reason.trim()) {
      return withMessage.reason;
    }
  }
  return fallback;
}

export default function CombineCardsDialog({
  open,
  account,
  card,
  combineRates,
  onClose,
  onSuccess,
  topOffsetPx = 0,
}: Readonly<CombineCardsDialogProps>) {
  const currentLevel = card.highestOwnedLevel;
  const currentCc = card.highestOwnedCc;
  const totalOwnedCc = card.totalOwnedCc;
  const { name, edition, foil, cardStats } = card;

  const [txProgress, setTxProgress] = useState<{
    status: "processing" | "verified" | "error";
    txId?: string;
    error?: string;
    message?: string;
  } | null>(null);

  const maxLevel = combineRates ? getCardMaxLevel(combineRates) : currentLevel;

  const matchingCards = useMemo(
    () => card.allCards?.filter((entry) => entry.edition === edition && entry.foil === foil) ?? [],
    [card.allCards, edition, foil]
  );

  const baseCombineStatus = useMemo(
    () =>
      combineRates
        ? checkCombineStatus({ combineRates, currentLevel, totalOwnedCc, allCards: matchingCards })
        : null,
    [combineRates, currentLevel, totalOwnedCc, matchingCards]
  );
  const hasInSetCards = baseCombineStatus?.disabledReason === "in-set";

  const combinableLevels = useMemo(
    () =>
      combineRates
        ? getCombinableLevels({ combineRates, currentLevel, totalOwnedCc, allCards: matchingCards })
        : [],
    [combineRates, currentLevel, totalOwnedCc, matchingCards]
  );
  const maxReachableByTotal = baseCombineStatus?.maxReachableLevel ?? currentLevel;

  // Auto-select the max reachable level on mount
  const initialSelectedLevel =
    combinableLevels.length > 0 ? combinableLevels[combinableLevels.length - 1] : currentLevel + 1;
  const [selectedLevel, setSelectedLevel] = useState<number>(initialSelectedLevel);

  // Exact card copies to burn to reach the selected level (null when unreachable).
  const combinePlan = combineRates
    ? selectCardsToCombine({ combineRates, targetLevel: selectedLevel, cards: matchingCards })
    : null;

  const targetLevelCc = combineRates ? (combineRates[selectedLevel - 1] ?? 0) : 0;
  const newAbilities = getNewAbilitiesAtLevel(cardStats.abilities, currentLevel, selectedLevel);

  // Per-level view models for the level selector. Memoized so the per-level
  // combine checks only recompute when the underlying card data changes.
  const levelButtonVms = useMemo<CombineLevelButtonVm[]>(() => {
    if (!combineRates || combineRates.length === 0) return [];

    return Array.from({ length: maxLevel }, (_, i) => i + 1).map((level) => {
      const isBelowOrAtCurrent = level <= currentLevel;
      const isReachable = combinableLevels.includes(level);
      const isReachableByTotal = level > currentLevel && level <= maxReachableByTotal;
      const targetStatus =
        level > currentLevel
          ? checkCombineStatus({
              combineRates,
              currentLevel,
              totalOwnedCc,
              allCards: matchingCards,
              targetLevel: level,
            })
          : null;
      const isBlockedByUnavailableCards =
        !isReachable &&
        isReachableByTotal &&
        (targetStatus?.disabledReason === "on-wagon" ||
          targetStatus?.disabledReason === "delegated-out" ||
          targetStatus?.disabledReason === "on-land");

      let tooltip = "";
      if (level === currentLevel) {
        tooltip = "Current level";
      } else if (level < currentLevel) {
        tooltip = "Below current level";
      } else if (isBlockedByUnavailableCards && targetStatus) {
        tooltip = getCombineTooltipText({
          isLoading: false,
          combineStatus: {
            canCombine: false,
            disabledReason: targetStatus.disabledReason,
            copiesNeeded: targetStatus.copiesNeeded,
            onWagonCount: targetStatus.onWagonCount,
            delegatedOutCount: targetStatus.delegatedOutCount,
            onLandCount: targetStatus.onLandCount,
          },
        });
      } else if (!isReachable) {
        const needed = Math.max(0, (combineRates[level - 1] ?? 0) - totalOwnedCc);
        tooltip = `Need ${largeNumberFormat(needed)} more BCX to reach`;
      }

      return { level, isReachable, isBelowOrAtCurrent, isBlockedByUnavailableCards, tooltip };
    });
  }, [
    combineRates,
    maxLevel,
    currentLevel,
    totalOwnedCc,
    matchingCards,
    combinableLevels,
    maxReachableByTotal,
  ]);

  const handleCombine = async () => {
    const isProcessing = txProgress?.status === "processing";
    if (isProcessing) return;

    // Validate selection
    if (!combinableLevels.includes(selectedLevel)) {
      setTxProgress({ status: "error", error: "Selected level is not reachable." });
      return;
    }

    if (!combinePlan) {
      setTxProgress({
        status: "error",
        error: hasInSetCards
          ? "Cannot combine while cards are in a set."
          : "No cards available to combine.",
      });
      return;
    }

    setTxProgress({ status: "processing" });

    try {
      // Broadcast combine transaction
      const txId = await broadcastCombineCards({
        account,
        cardUids: combinePlan.cardUids,
      });

      const [confirmation] = await waitForTransactions([txId]);
      if (confirmation?.status.success) {
        setTxProgress({ status: "verified", txId });
      } else {
        setTxProgress({
          status: "error",
          txId,
          error: confirmation?.status.message ?? "Transaction was not verified.",
        });
      }

      // Call onSuccess callback if provided (to refresh data)
      if (onSuccess) {
        try {
          await onSuccess();
        } catch (err) {
          console.error("Failed to refresh data after combine:", err);
        }
      }
    } catch (err) {
      const message = extractErrorMessage(err, "Failed to combine cards");
      setTxProgress({ status: "error", error: message });
    }
  };

  const handleClose = () => {
    if (txProgress?.status === "processing") return;
    setTxProgress(null);
    setSelectedLevel(initialSelectedLevel);
    onClose();
  };

  const isProcessing = txProgress?.status === "processing";

  const currentCardImage = getCardImageByLevel(name, edition, foil, currentLevel);
  const targetCardImage = getCardImageByLevel(name, edition, foil, selectedLevel);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          marginTop: `${topOffsetPx}px`,
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <TbCopyPlusFilled size={24} />
        Combine Cards
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <Stack spacing={3}>
          {/* Card Header */}
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {name}
            </Typography>
            <Chip
              label={`Current Level: ${currentLevel}`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Box>

          {/* Upgrade Preview */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              justifyContent: "center",
              opacity: isProcessing ? 0.72 : 1,
            }}
          >
            {/* Current Card */}
            <Box sx={{ textAlign: "center" }}>
              <Image
                src={currentCardImage}
                alt={`${name} Level ${currentLevel}`}
                width={150}
                height={180}
                priority
                style={{ borderRadius: 8 }}
              />
              <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                Level {currentLevel}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {largeNumberFormat(currentCc)} /{" "}
                {largeNumberFormat(combineRates?.[currentLevel - 1] ?? 0)} BCX
              </Typography>
            </Box>

            {/* Arrow */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pulse 2s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1, transform: "scaleX(1)" },
                  "50%": { opacity: 0.6, transform: "scaleX(1.2)" },
                },
              }}
            >
              <MdArrowForward size={32} />
            </Box>

            {/* Target Card */}
            <Box sx={{ textAlign: "center" }}>
              <Image
                src={targetCardImage}
                alt={`${name} Level ${selectedLevel}`}
                width={150}
                height={180}
                priority
                style={{ borderRadius: 8 }}
              />
              <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                Level {selectedLevel}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {largeNumberFormat(targetLevelCc)} BCX required
              </Typography>
            </Box>
          </Box>

          {/* Level Selector */}
          {combineRates && combineRates.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, textAlign: "center" }}>
                Select Target Level
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  justifyContent: "center",
                }}
              >
                {levelButtonVms.map((vm) => (
                  <CombineLevelButton
                    key={vm.level}
                    vm={vm}
                    isSelected={vm.level === selectedLevel}
                    disabled={isProcessing}
                    onSelect={setSelectedLevel}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Stats Preview */}
          {newAbilities.length > 0 && (
            <Box>
              <Typography variant="subtitle2">New Abilities at Level {selectedLevel}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {newAbilities.map((ability) => (
                  <Chip key={ability} label={ability} size="small" color="success" />
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          sx={{ width: "100%", justifyContent: "right" }}
        >
          <PurchaseTxProgressPanel txProgress={txProgress} />
          <Button onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Tooltip
            title={
              !combinableLevels.includes(selectedLevel)
                ? "Selected level is not reachable with current cards"
                : !combinePlan
                  ? "No cards available to combine"
                  : "Combine to this level"
            }
          >
            <span>
              <Button
                onClick={handleCombine}
                variant="contained"
                disabled={isProcessing || !combinableLevels.includes(selectedLevel) || !combinePlan}
              >
                Combine to Level {selectedLevel}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
