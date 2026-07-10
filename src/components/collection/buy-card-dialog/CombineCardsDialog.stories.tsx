import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import CombineCardsDialog from "@/components/collection/buy-card-dialog/CombineCardsDialog";
import type { DetailedPlayerCardCollectionItem, CardDetail } from "@/types/card";
import type { CardStats } from "@/types/spl/cardDetails";

// Mock card data
const mockCardStats: CardStats = {
  mana: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  attack: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  ranged: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  magic: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  armor: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  health: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  speed: [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
  abilities: [
    ["Flying"],
    ["Flying"],
    ["Flying", "Recharge"],
    ["Flying", "Recharge"],
    ["Flying", "Recharge", "Heal"],
    ["Flying", "Recharge", "Heal"],
    ["Flying", "Recharge", "Heal"],
    ["Flying", "Recharge", "Heal", "Enrage"],
    ["Flying", "Recharge", "Heal", "Enrage"],
    ["Flying", "Recharge", "Heal", "Enrage", "Immunity"],
  ],
};

const mockCard: DetailedPlayerCardCollectionItem & { foil: "regular" | "gold" } = {
  cardDetailId: 1,
  name: "Dragon",
  edition: 4,
  tier: 0,
  rarity: "legendary",
  color: "red",
  secondaryColor: undefined,
  role: "unit",
  availableFoils: ["regular", "gold"],
  foil: "regular",
  cardStats: mockCardStats,
};

const mockAllCards: CardDetail[] = [
  {
    id: 1,
    uid: "uid-1",
    name: "Dragon",
    owner: "testaccount",
    xp: 100,
    edition: 4,
    cardSet: "alpha",
    collectionPower: 5000,
    bcx: 1,
    bcxUnbound: 0,
    foil: "regular",
    mint: null,
    level: 1,
    imgUrl: "https://d36mxiodymuqjm.cloudfront.net/website/d_golem_lv1.png",
  },
  {
    id: 1,
    uid: "uid-2",
    name: "Dragon",
    owner: "testaccount",
    xp: 100,
    edition: 4,
    cardSet: "alpha",
    collectionPower: 5000,
    bcx: 1,
    bcxUnbound: 0,
    foil: "regular",
    mint: null,
    level: 1,
    imgUrl: "https://d36mxiodymuqjm.cloudfront.net/website/d_golem_lv1.png",
  },
  {
    id: 1,
    uid: "uid-3",
    name: "Dragon",
    owner: "testaccount",
    xp: 100,
    edition: 4,
    cardSet: "alpha",
    collectionPower: 5000,
    bcx: 2,
    bcxUnbound: 0,
    foil: "regular",
    mint: null,
    level: 2,
    imgUrl: "https://d36mxiodymuqjm.cloudfront.net/website/d_golem_lv2.png",
  },
];

const meta: Meta<typeof CombineCardsDialog> = {
  component: CombineCardsDialog,
  title: "Cards/CombineCardsDialog",
  tags: ["autodocs"],
  argTypes: {},
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Upgrade available - Card can be combined to the next level
 */
export const UpgradeAvailable: Story = {
  args: {
    open: true,
    account: "testaccount",
    card: mockCard,
    currentLevel: 1,
    currentCc: 1,
    totalOwnedCc: 5,
    allCards: mockAllCards,
    combineRates: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
    onClose: () => {},
  },
};

/**
 * Multiple target levels available
 */
export const MultipleTargetLevels: Story = {
  args: {
    open: true,
    account: "testaccount",
    card: mockCard,
    currentLevel: 2,
    currentCc: 4,
    totalOwnedCc: 100,
    allCards: mockAllCards,
    combineRates: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
    onClose: () => {},
  },
};

/**
 * Already max level - Cannot combine
 */
export const AlreadyMaxLevel: Story = {
  args: {
    open: true,
    account: "testaccount",
    card: mockCard,
    currentLevel: 10,
    currentCc: 512,
    totalOwnedCc: 512,
    allCards: mockAllCards,
    combineRates: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
    onClose: () => {},
  },
};

/**
 * Not enough copies - Cannot combine
 */
export const NotEnoughCopies: Story = {
  args: {
    open: true,
    account: "testaccount",
    card: mockCard,
    currentLevel: 3,
    currentCc: 4,
    totalOwnedCc: 6,
    allCards: mockAllCards,
    combineRates: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
    onClose: () => {},
  },
};

/**
 * Loading state - Transaction is being submitted
 */
export const Loading: Story = {
  args: {
    open: true,
    account: "testaccount",
    card: mockCard,
    currentLevel: 1,
    currentCc: 1,
    totalOwnedCc: 5,
    allCards: mockAllCards,
    combineRates: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
    onClose: () => {},
  },
  decorators: [
    (Story: React.ComponentType) => {
      // Show loading state by default
      setTimeout(() => {
        const dialog = document.querySelector("dialog");
        if (dialog) {
          dialog.querySelector("button")?.click();
        }
      }, 100);
      return <Story />;
    },
  ],
};

/**
 * Success state - Combine operation completed
 */
export const Success: Story = {
  args: {
    open: true,
    account: "testaccount",
    card: mockCard,
    currentLevel: 1,
    currentCc: 1,
    totalOwnedCc: 5,
    allCards: mockAllCards,
    combineRates: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
    onClose: () => {},
    onSuccess: async () => {
      // Simulate success
      return Promise.resolve();
    },
  },
};

/**
 * Gold foil - Higher combine rates
 */
export const GoldFoil: Story = {
  args: {
    open: true,
    account: "testaccount",
    card: {
      ...mockCard,
      availableFoils: ["gold"],
    },
    currentLevel: 1,
    currentCc: 2,
    totalOwnedCc: 10,
    allCards: mockAllCards,
    combineRates: [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024],
    onClose: () => {},
  },
};

/**
 * No abilities - Card with no ability progression
 */
export const NoAbilities: Story = {
  args: {
    open: true,
    account: "testaccount",
    card: {
      ...mockCard,
      cardStats: {
        ...mockCardStats,
        abilities: [[], [], [], [], [], [], [], [], [], []],
      },
    },
    currentLevel: 1,
    currentCc: 1,
    totalOwnedCc: 5,
    allCards: mockAllCards,
    combineRates: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
    onClose: () => {},
  },
};
