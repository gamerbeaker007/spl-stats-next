import { CardFoil, cardFoilOptions } from "@/types/card";
import { WEB_URL } from "../staticsIconUrls";

export function abilityIconUrl(name: string): string {
  const baseName = name.split(":")[0];

  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${WEB_URL}website/abilities/ability_${slug}.png`;
}

// ---------------------------------------------------------------------------
// Foil label — numeric foil (legacy API values)
// ---------------------------------------------------------------------------

/** Human-readable label for a numeric foil value (0=regular, 1-2=gold, 3-4=black). */
export function getFoilLabel(foil: number | CardFoil): string {
  const idx = typeof foil === "string" ? toCardFoilInt(foil) : foil;

  const FOIL_LABELS: Record<number, string> = {
    0: "Regular",
    1: "Gold Foil",
    2: "Gold Foil Arcane",
    3: "Black Foil",
    4: "Black Foil Arcane",
  };
  return FOIL_LABELS[idx] ?? `Foil ${foil}`;
}

export function toCardFoil(foil: number): CardFoil {
  return cardFoilOptions[foil] ?? "regular";
}
export function toCardFoilInt(foil: CardFoil): number {
  return cardFoilOptions.indexOf(foil);
}
