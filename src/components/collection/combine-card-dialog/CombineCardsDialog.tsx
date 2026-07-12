"use client";

import PurchaseTxProgressPanel from "@/components/collection/buy-card-dialog/PurchaseTxProgressPanel";
import { broadcastCombineCards, waitForTransactions } from "@/lib/frontend/purchase/splBroadcast";
import {
  buildTargetLevelPreview,
  checkCombineStatus,
  getCardMaxLevel,
  getCombinableLevels,
  getCombineTooltipText,
} from "@/lib/shared/buy-missing-cc";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { largeNumberFormat } from "@/lib/utils";
import type { CardDetail, CardFoil, DetailedPlayerCardCollectionItem } from "@/types/card";
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
import { useState } from "react";
import { MdArrowForward } from "react-icons/md";
import { TbCopyPlusFilled } from "react-icons/tb";

interface CombineCardsDialogProps {
  open: boolean;
  account: string;
  card: DetailedPlayerCardCollectionItem & {
    foil: CardFoil;
    allCards?: CardDetail[];
    highestOwnedLevel: number;
    highestOwnedCc: number;
    totalOwnedCc: number;
  };
  combineRates?: number[];
  onClose: () => void;
  onSuccess?: () => Promise<void>;
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
  const { currentLevel, currentCc, totalOwnedCc, allCards } = {
    currentLevel: card.highestOwnedLevel,
    currentCc: card.highestOwnedCc,
    totalOwnedCc: card.totalOwnedCc,
    allCards: card.allCards,
  };
  const { name, edition, foil, cardStats } = card;

  const [txProgress, setTxProgress] = useState<{
    status: "processing" | "verified" | "error";
    txId?: string;
    error?: string;
    message?: string;
  } | null>(null);

  const maxLevel = combineRates ? getCardMaxLevel(combineRates) : currentLevel;

  const matchingCards =
    allCards?.filter((entry) => entry.edition === edition && entry.foil === foil) ?? [];
  const sortedByBasePriority = [...matchingCards].sort((a, b) => {
    const levelDelta = (b.level ?? 0) - (a.level ?? 0);
    if (levelDelta !== 0) return levelDelta;
    return (b.bcx ?? 0) - (a.bcx ?? 0);
  });
  const baseUid = sortedByBasePriority[0]?.uid;
  const baseCombineStatus = combineRates
    ? checkCombineStatus({
        combineRates,
        currentLevel,
        totalOwnedCc,
        allCards: matchingCards,
      })
    : null;
  const hasInSetCards = baseCombineStatus?.disabledReason === "in-set";
  const usableOwnedCc = baseCombineStatus?.currentCc ?? totalOwnedCc;

  const combinableLevels = combineRates
    ? getCombinableLevels({
        combineRates,
        currentLevel,
        totalOwnedCc,
        allCards: matchingCards,
      })
    : [];
  const maxReachableByTotal = baseCombineStatus?.maxReachableLevel ?? currentLevel;

  // Auto-select the max reachable level on mount
  const initialSelectedLevel =
    combinableLevels.length > 0 ? combinableLevels[combinableLevels.length - 1] : currentLevel + 1;
  const [selectedLevel, setSelectedLevel] = useState<number>(initialSelectedLevel);

  const availableCards = matchingCards.filter((entry) => {
    if (!entry.uid || (entry.bcx ?? 0) <= 0 || entry.inSet) return false;
    if (!entry.onWagon && !entry.delegatedTo) return true;
    return entry.uid === baseUid;
  });
  const selectedCardsForTarget = (() => {
    if (!combineRates || availableCards.length === 0) {
      return [] as CardDetail[];
    }

    const requiredBcx = combineRates[selectedLevel - 1] ?? 0;
    if (requiredBcx <= 0) {
      return [] as CardDetail[];
    }

    const sortedByBasePriority = [...availableCards].sort((a, b) => {
      const levelDelta = (b.level ?? 0) - (a.level ?? 0);
      if (levelDelta !== 0) return levelDelta;
      return (b.bcx ?? 0) - (a.bcx ?? 0);
    });

    const baseCard = sortedByBasePriority[0];
    if (!baseCard) {
      return [] as CardDetail[];
    }

    const remaining = sortedByBasePriority.slice(1).sort((a, b) => {
      const levelDelta = (a.level ?? 0) - (b.level ?? 0);
      if (levelDelta !== 0) return levelDelta;
      return (a.bcx ?? 0) - (b.bcx ?? 0);
    });

    const picked: CardDetail[] = [baseCard];
    let sumBcx = baseCard.bcx ?? 0;

    for (const candidate of remaining) {
      if (sumBcx >= requiredBcx) break;
      picked.push(candidate);
      sumBcx += candidate.bcx ?? 0;
    }

    return sumBcx >= requiredBcx ? picked : ([] as CardDetail[]);
  })();

  const targetLevelCc = combineRates ? (combineRates[selectedLevel - 1] ?? 0) : 0;
  const preview = buildTargetLevelPreview(
    cardStats,
    currentLevel,
    selectedLevel,
    currentCc,
    targetLevelCc,
    Math.max(0, targetLevelCc - usableOwnedCc)
  );

  const handleCombine = async () => {
    const isProcessing = txProgress?.status === "processing";
    if (isProcessing) return;

    // Validate selection
    if (!combinableLevels.includes(selectedLevel)) {
      setTxProgress({ status: "error", error: "Selected level is not reachable." });
      return;
    }

    if (selectedCardsForTarget.length === 0) {
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
      const cardUids = selectedCardsForTarget.map((c) => c.uid);
      const txId = await broadcastCombineCards({
        account,
        cardUids,
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
                {Array.from({ length: maxLevel }, (_, i) => i + 1).map((level) => {
                  const isBelowOrAtCurrent = level <= currentLevel;
                  const isReachable = combinableLevels.includes(level);
                  const isReachableByTotal = level > currentLevel && level <= maxReachableByTotal;
                  const targetStatus =
                    combineRates && level > currentLevel
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
                      targetStatus?.disabledReason === "delegated-out");
                  const isSelected = level === selectedLevel;

                  let tooltipTitle = "";
                  if (level === currentLevel) {
                    tooltipTitle = "Current level";
                  } else if (level < currentLevel) {
                    tooltipTitle = "Below current level";
                  } else if (isBlockedByUnavailableCards && targetStatus) {
                    tooltipTitle = getCombineTooltipText({
                      isLoading: false,
                      combineStatus: {
                        canCombine: false,
                        disabledReason: targetStatus.disabledReason,
                        copiesNeeded: targetStatus.copiesNeeded,
                        onWagonCount: targetStatus.onWagonCount,
                        delegatedOutCount: targetStatus.delegatedOutCount,
                      },
                    });
                  } else if (!isReachable) {
                    const needed = Math.max(0, (combineRates[level - 1] ?? 0) - totalOwnedCc);
                    tooltipTitle = `Need ${largeNumberFormat(needed)} more BCX to reach`;
                  }

                  return (
                    <Tooltip key={level} title={tooltipTitle} placement="top">
                      <span>
                        <Button
                          variant={isSelected ? "contained" : "outlined"}
                          size="small"
                          onClick={() =>
                            isReachable && !isBelowOrAtCurrent && setSelectedLevel(level)
                          }
                          disabled={isProcessing || isBelowOrAtCurrent || !isReachable}
                          sx={{
                            minWidth: 38,
                            fontWeight: isSelected ? 700 : 400,

                            ...(isSelected && {
                              bgcolor: "success.main",
                              borderColor: "success.main",
                              color: "white",
                              "&:hover": { bgcolor: "success.dark" },
                            }),

                            ...(isReachable &&
                              !isSelected &&
                              !isBelowOrAtCurrent && {
                                borderColor: "success.main",
                                color: "success.main",
                                "&:hover": {
                                  bgcolor: "success.light",
                                  opacity: 0.8,
                                },
                              }),

                            ...(isBlockedByUnavailableCards && {
                              borderColor: "warning.main",
                              color: "warning.main",
                              "&.Mui-disabled": {
                                borderColor: "warning.main",
                                color: "warning.main",
                                opacity: 0.6, // optional
                                WebkitTextFillColor: "currentColor", // helps Safari
                              },
                            }),
                          }}
                        >
                          {level}
                        </Button>
                      </span>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Stats Preview */}
          {preview.newAbilities.length > 0 && (
            <Box>
              <Typography variant="subtitle2">New Abilities at Level {selectedLevel}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {preview.newAbilities.map((ability) => (
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
                : selectedCardsForTarget.length === 0
                  ? "No cards available to combine"
                  : "Combine to this level"
            }
          >
            <span>
              <Button
                onClick={handleCombine}
                variant="contained"
                disabled={
                  isProcessing ||
                  !combinableLevels.includes(selectedLevel) ||
                  selectedCardsForTarget.length === 0
                }
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
