import type { CardFoil } from "@/types/card";
import Box from "@mui/material/Box";
import { TbCardsFilled } from "react-icons/tb";

export interface FoilOption {
  value: CardFoil;
  /** Short display label */
  label: string;
  /** Icon + border color */
  color: string;
  /** Text color on top of the icon */
  textColor: string;
}

export const DEFAULT_CARD_FOIL_OPTIONS: FoilOption[] = [
  { value: "regular", label: "R", color: "#9e9e9e", textColor: "#fff" },
  { value: "gold", label: "G", color: "#ffc107", textColor: "#5d4000" },
  { value: "gold arcane", label: "GV", color: "#ff8f00", textColor: "#fff" },
  { value: "black", label: "B", color: "#424242", textColor: "#fff" },
  { value: "black arcane", label: "BV", color: "#607d8b", textColor: "#fff" },
];

export function renderCardFoil(cardFoil: CardFoil, size: number, bordered = false) {
  const opt = DEFAULT_CARD_FOIL_OPTIONS.find((opt) => opt.value === cardFoil) || {
    color: "none",
    textColor: "none",
    label: "",
  };
  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: bordered ? "2px solid" : "none",
        borderRadius: "20%",
        borderColor: opt.color,
        width: size,
        height: size,
        cursor: "pointer",
        opacity: 1,
        transition: "opacity 0.15s, filter 0.15s",
        filter: "none",
        "&:hover": { opacity: 1 },
        userSelect: "none",
      }}
    >
      {/* Card icon as full background */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: opt.color,
        }}
      >
        <TbCardsFilled size={size} />
      </Box>

      {/* Bold label on top */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          color: opt.textColor,
          fontSize: "0.8rem",
          fontWeight: 800,
          lineHeight: 1,
          textAlign: "center",
          textShadow: "0 0 2px rgba(0,0,0,0.4)",
          letterSpacing: "0.02em",
          pr: "4px",
        }}
      >
        {opt.label}
      </Box>
    </Box>
  );
}
