"use client";

import {
  buildTargetLevelPreview,
  getCombinableLevels,
  getCardMaxLevel,
} from "@/lib/shared/buy-missing-cc";
import { getCardImageByLevel } from "@/lib/shared/card-image-utils";
import { broadcastCombineCards } from "@/lib/frontend/purchase/splBroadcast";
import { largeNumberFormat } from "@/lib/utils";
import type { DetailedPlayerCardCollectionItem, CardDetail, CardFoil } from "@/types/card";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
} from "@mui/material";
import Image from "next/image";
import { useState } from "react";
import { MdCheckCircle, MdArrowForward, MdWarning, MdAutoFixHigh } from "react-icons/md";

interface CombineCardsDialogProps {
  open: boolean;
  account: string;
  card: DetailedPlayerCardCollectionItem & { foil: CardFoil; allCards?: CardDetail[] };
  currentLevel: number;
  currentCc: number;
  totalOwnedCc: number;
  allCards?: CardDetail[];
  combineRates?: number[];
  onClose: () => void;
  onSuccess?: () => Promise<void>;
  topOffsetPx?: number;
}

type DialogState = "preview" | "loading" | "success" | "error";

export default function CombineCardsDialog({
  open,
  account,
  card,
  currentLevel,
  currentCc,
  totalOwnedCc,
  allCards,
  combineRates,
  onClose,
  onSuccess,
  topOffsetPx = 0,
}: Readonly<CombineCardsDialogProps>) {
  const { name, edition, foil, cardStats } = card;

  const [state, setState] = useState<DialogState>("preview");
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const maxLevel = combineRates ? getCardMaxLevel(combineRates) : currentLevel;
  const combinableLevels = combineRates
    ? getCombinableLevels(currentLevel, totalOwnedCc, combineRates)
    : [];

  // Auto-select the max reachable level on mount
  const initialSelectedLevel =
    combinableLevels.length > 0 ? combinableLevels[combinableLevels.length - 1] : currentLevel + 1;
  const [selectedLevel, setSelectedLevel] = useState<number>(initialSelectedLevel);

  // Get cards to combine (all cards of this type below the current level to use for combining up)
  const cardsToUse = allCards ? allCards.filter((c) => c.level < currentLevel + 1) : [];

  const targetLevelCc = combineRates ? (combineRates[selectedLevel - 1] ?? 0) : 0;
  const preview = buildTargetLevelPreview(
    cardStats,
    currentLevel,
    selectedLevel,
    currentCc,
    targetLevelCc,
    Math.max(0, targetLevelCc - totalOwnedCc)
  );

  const handleCombine = async () => {
    // Validate selection
    if (!combinableLevels.includes(selectedLevel)) {
      setError("Selected level is not reachable.");
      return;
    }

    if (cardsToUse.length === 0) {
      setError("No cards available to combine.");
      return;
    }

    setState("loading");
    setError(null);
    setResult(null);

    try {
      // Broadcast combine transaction
      const cardUids = cardsToUse.map((c) => c.uid);
      const txId = await broadcastCombineCards({
        account,
        cardUids,
      });

      setTxId(txId);
      setState("success");
      setResult({ success: true, message: `Combine successful! Transaction: ${txId}` });

      // Call onSuccess callback if provided (to refresh data)
      if (onSuccess) {
        try {
          await onSuccess();
        } catch (err) {
          console.error("Failed to refresh data after combine:", err);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to combine cards";
      // Check if user cancelled (common Keychain SDK error)
      if (
        message.includes("cancelled") ||
        message.includes("rejected") ||
        message.includes("denied")
      ) {
        setResult({ success: false, message: `Operation cancelled: ${message}` });
      } else {
        setError(message);
      }
      setState("preview");
    }
  };

  const handleClose = () => {
    if (state !== "loading") {
      setState("preview");
      setError(null);
      setResult(null);
      setTxId(null);
      setSelectedLevel(initialSelectedLevel);
      onClose();
    }
  };

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
        <MdAutoFixHigh size={24} />
        Combine Cards
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        {state === "success" ? (
          // Success state
          <Stack spacing={2}>
            <Box sx={{ textAlign: "center", py: 2 }}>
              <MdCheckCircle size={48} color="green" style={{ marginBottom: 16 }} />
              <Typography variant="h6">Combine Initiated!</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Your transaction has been submitted to the blockchain.
              </Typography>
              {txId && (
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 2, wordBreak: "break-all" }}
                >
                  <strong>TX ID:</strong> {txId}
                </Typography>
              )}
              {result && (
                <Alert severity={result.success ? "success" : "warning"} sx={{ mt: 2 }}>
                  {result.message}
                </Alert>
              )}
            </Box>
          </Stack>
        ) : state === "loading" ? (
          // Loading state
          <Stack spacing={2} sx={{ textAlign: "center", py: 3 }}>
            <CircularProgress />
            <Typography>Processing combine transaction...</Typography>
            <Box
              sx={{ height: 6, backgroundColor: "#e0e0e0", borderRadius: 3, overflow: "hidden" }}
            >
              <Box
                sx={{
                  height: "100%",
                  backgroundColor: "primary.main",
                  animation: "slideRight 1.5s ease-in-out infinite",
                  "@keyframes slideRight": {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(100%)" },
                  },
                }}
              />
            </Box>
          </Stack>
        ) : (
          // Preview state
          <Stack spacing={3}>
            {/* Error Alert */}
            {error && <Alert severity="error">{error}</Alert>}

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
                    const isSelected = level === selectedLevel;

                    let tooltipTitle = "";
                    if (level === currentLevel) {
                      tooltipTitle = "Current level";
                    } else if (level < currentLevel) {
                      tooltipTitle = "Below current level";
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
                            disabled={isBelowOrAtCurrent || !isReachable}
                            sx={{
                              minWidth: 38,
                              fontWeight: isSelected ? 700 : 400,
                              // SELECTED state: solid green
                              ...(isSelected && {
                                bgcolor: "success.main",
                                borderColor: "success.main",
                                color: "white",
                                "&:hover": { bgcolor: "success.dark" },
                              }),
                              // SELECTABLE but not selected: green outline
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

            {/* Disabled Reason in Alert */}
            {error && (
              <Alert severity="error" icon={<MdWarning />}>
                {error}
              </Alert>
            )}
            {result && !result.success && (
              <Alert severity="warning" icon={<MdWarning />}>
                {result.message}
              </Alert>
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
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{state === "success" ? "Close" : "Cancel"}</Button>
        {state === "preview" && (
          <Tooltip
            title={
              !combinableLevels.includes(selectedLevel)
                ? "Selected level is not reachable with current cards"
                : cardsToUse.length === 0
                  ? "No cards available to combine"
                  : "Combine to this level"
            }
          >
            <span>
              <Button
                onClick={handleCombine}
                variant="contained"
                disabled={!combinableLevels.includes(selectedLevel) || cardsToUse.length === 0}
              >
                Combine to Level {selectedLevel}
              </Button>
            </span>
          </Tooltip>
        )}
      </DialogActions>
    </Dialog>
  );
}
