"use client";

import { CardElement, CardFoil, CardRarity, CardRole, CardSetName } from "@/types/card";
import { getSetName } from "@/lib/shared/edition-utils";
import React, { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface CardFilterContextType {
  selectedSets: CardSetName[];
  selectedRarities: CardRarity[];
  selectedElements: CardElement[];
  selectedRoles: CardRole[];
  selectedFoilCategories: CardFoil[];
  drawerOpen: boolean;
  hideMissingCards: boolean;

  setSelectedSets: (sets: CardSetName[]) => void;
  setSelectedRarities: (rarities: CardRarity[]) => void;
  setSelectedElements: (elements: CardElement[]) => void;
  setSelectedRoles: (roles: CardRole[]) => void;
  setSelectedFoilCategories: (foils: CardFoil[]) => void;
  setDrawerOpen: (open: boolean) => void;
  toggleDrawer: () => void;
  setHideMissingCards: (hide: boolean) => void;

  filterCard: (
    edition: number,
    rarity: CardRarity,
    color: CardElement,
    secondaryColor: CardElement | undefined,
    role: CardRole
  ) => boolean;
}

const CardFilterContext = createContext<CardFilterContextType | undefined>(undefined);

export const useCardFilter = () => {
  const context = useContext(CardFilterContext);
  if (!context) {
    throw new Error("useCardFilter must be used within a CardFilterProvider");
  }
  return context;
};

interface CardFilterProviderProps {
  children: ReactNode;
}

export const CardFilterProvider: React.FC<CardFilterProviderProps> = ({ children }) => {
  const modernSets: CardSetName[] = ["rebellion", "conclave", "foundation"];

  const [selectedSets, setSelectedSets] = useState<CardSetName[]>(modernSets);
  const [selectedRarities, setSelectedRarities] = useState<CardRarity[]>([]);
  const [selectedElements, setSelectedElements] = useState<CardElement[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<CardRole[]>([]);
  const [selectedFoilCategories, setSelectedFoilCategories] = useState<CardFoil[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [hideMissingCards, setHideMissingCards] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen((prev) => !prev);
  };

  const filterCard = useCallback(
    (
      edition: number,
      rarity: CardRarity,
      color: CardElement,
      secondaryColor: CardElement | undefined,
      role: CardRole
    ): boolean => {
      if (selectedSets.length > 0) {
        const setName = getSetName(edition);
        if (!setName || !selectedSets.includes(setName)) return false;
      }
      if (selectedRarities.length > 0) {
        if (!rarity || !selectedRarities.includes(rarity)) return false;
      }
      if (selectedElements.length > 0) {
        if (!color) return false;
        const hasMatchingElement = selectedElements.some(
          (element) => element === color || element === secondaryColor
        );
        if (!hasMatchingElement) return false;
      }
      if (selectedRoles.length > 0) {
        if (!role || !selectedRoles.includes(role)) return false;
      }
      return true;
    },
    [selectedSets, selectedRarities, selectedElements, selectedRoles]
  );

  const value: CardFilterContextType = {
    selectedSets,
    selectedRarities,
    selectedElements,
    selectedRoles,
    selectedFoilCategories,
    drawerOpen,
    hideMissingCards,
    setSelectedSets,
    setSelectedRarities,
    setSelectedElements,
    setSelectedRoles,
    setSelectedFoilCategories,
    setDrawerOpen,
    toggleDrawer,
    setHideMissingCards,
    filterCard,
  };

  return <CardFilterContext.Provider value={value}>{children}</CardFilterContext.Provider>;
};
