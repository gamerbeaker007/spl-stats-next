"use client";

import { getCardImageV2 } from "@/lib/shared/card-image-utils";
import { getFoilLabel } from "@/lib/shared/card-utils";
import { CardPrizeData } from "@/types/jackpot-prizes/shared";
import { SplCardDetail } from "@/types/spl/cardDetails";
import { Box, Button, CardContent, Card as MuiCard, Typography } from "@mui/material";
import Image from "next/image";
import { memo, useMemo } from "react";

interface Props {
  prizeData: CardPrizeData;
  card: SplCardDetail;
  onFoilClick: (foil: number) => void;
  selectedFoil?: number | null;
}

const DEFAULT_FOIL_TYPES = [3, 2, 4];
const ALL_FOIL_TYPES = [0, 1, 2, 3, 4];

function Card({ prizeData, card, onFoilClick, selectedFoil }: Props) {
  const editions = card.editions.split(",").map((e) => e.trim());
  const isArchmageYabanius = card.name === "Archmage Yabanius";
  const isConclaveArcanaRewardEdition = editions.includes("18");
  const isFrontierDraws = editions.includes("15") || editions.includes("16");
  const isEdition17Extra = editions.includes("17");
  const isLandCard = editions.includes("19");
  const isStarlight = editions.includes("22");

  const foilTypes = useMemo(
    () => (isArchmageYabanius ? ALL_FOIL_TYPES : DEFAULT_FOIL_TYPES),
    [isArchmageYabanius]
  );

  const imageUrl = getCardImageV2(card.name || "Unknown", 0, isLandCard);
  const isSelected = selectedFoil !== null && selectedFoil !== undefined;

  return (
    <MuiCard
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        outline: isSelected ? "2px solid" : "none",
        outlineColor: "primary.main",
        transition: "outline 0.15s",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <Box sx={{ flexShrink: 0 }}>
            <Image src={imageUrl} alt={card.name} width={100} height={150} className="card-image" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" gutterBottom>
              {card.name}
            </Typography>

            <Box sx={{ mt: 2, mb: 2 }}>
              {/* Gold Foil — special request entry for land cards */}
              {isLandCard && (
                <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                  <Typography variant="body2" sx={{ color: "warning.main" }}>
                    <strong>Gold Foil:</strong>
                  </Typography>

                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onFoilClick(1)}
                    sx={{
                      ml: "auto",
                      flexShrink: 0,
                      px: 1,
                      py: 0.25,
                      minWidth: 0,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "none",
                      borderRadius: 1.5,
                      lineHeight: 1.4,
                      color: selectedFoil === 1 ? "primary.main" : "warning.main",
                      borderColor: selectedFoil === 1 ? "primary.main" : "warning.main",
                      "&:hover": {
                        borderColor: "primary.main",
                        color: "primary.main",
                        bgcolor: "action.hover",
                      },
                    }}
                    title="View Gold Foil mint history (on special request for land cards)"
                  >
                    Details
                  </Button>
                </Box>
              )}

              {foilTypes.map((foil) => {
                const prizeDataFoil = prizeData.foils.find((f) => foil === f.foil);
                const minted = prizeDataFoil?.minted ?? 0;
                const total = prizeDataFoil?.total ?? 0;
                const hasData = !!prizeDataFoil;

                const showFullStats =
                  foil !== 3 ||
                  isArchmageYabanius ||
                  isConclaveArcanaRewardEdition ||
                  isFrontierDraws ||
                  isEdition17Extra ||
                  isLandCard ||
                  isStarlight;
                const displayText = hasData
                  ? showFullStats
                    ? `${minted} / ${total}`
                    : `${total}`
                  : "";

                const isFoilSelected = selectedFoil === foil;

                return (
                  <Box key={foil} sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="body2">
                      <strong>{getFoilLabel(foil)}:</strong> {displayText}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onFoilClick(foil)}
                      sx={{
                        ml: "auto",
                        flexShrink: 0,
                        px: 1,
                        py: 0.25,
                        minWidth: 0,
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "none",
                        borderRadius: 1.5,
                        lineHeight: 1.4,
                        color: isFoilSelected ? "primary.main" : "text.secondary",
                        borderColor: isFoilSelected ? "primary.main" : "divider",
                        "&:hover": {
                          borderColor: "primary.main",
                          color: "primary.main",
                          bgcolor: "action.hover",
                        },
                      }}
                      title={`View ${getFoilLabel(foil)} mint history`}
                    >
                      Details
                    </Button>{" "}
                  </Box>
                );
              })}
            </Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Total {isArchmageYabanius ? "" : "(GFA/BFA)"} Minted: {prizeData.total_minted}
            </Typography>
            <Typography variant="body2">
              Total {isArchmageYabanius ? "" : "(GFA/BFA)"}: {prizeData.total}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </MuiCard>
  );
}

export default memo(Card);
