import {
  edition_conclave_arcana_icon_url,
  edition_conclave_extra_icon_url,
  edition_conclave_rewards_icon_url,
  edition_escalation_icon_url,
  edition_foundation_icon_url,
  edition_land_card_icon_url,
  edition_starlight_icon_url,
  frontier_icon_url,
  jackpot_icon_url,
  ranked_icon_url,
} from "@/lib/staticsIconUrls";
import { GiChest } from "react-icons/gi";
import { MdCasino, MdHistory } from "react-icons/md";

export const JACKPOT_BASE = "/jackpot-prizes";

export interface JackpotNavItem {
  label: string;
  /** Short label for compact menus/cards. */
  shortLabel: string;
  href: string;
  icon: string;
  alt: string;
  description: string;
  color?: string;
}

export interface JackpotNavGroup {
  key: "mint-history" | "jackpot" | "fortune-draws";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: JackpotNavItem[];
}

export const mintHistoryItems: JackpotNavItem[] = [
  {
    label: "CA Mint History",
    shortLabel: "Conclave Arcana",
    href: `${JACKPOT_BASE}/ca-mint-history`,
    icon: edition_conclave_arcana_icon_url,
    alt: "Conclave Arcana",
    description: "Card mint histories for the Conclave Arcana set, with foils and lucky winners.",
  },
  {
    label: "CA Extra Mint History",
    shortLabel: "Conclave Arcana - Extra",
    href: `${JACKPOT_BASE}/conclave-rewards-mint-history`,
    icon: edition_conclave_extra_icon_url,
    alt: "Conclave Rewards",
    description: "Recent winners and mint history of the jackpot chest reward foils.",
  },

  {
    label: "CA Escalation Mint History",
    shortLabel: "Conclave Arcana - Escalation",
    href: `${JACKPOT_BASE}/escalation-mint-history`,
    icon: edition_escalation_icon_url,
    alt: "Escalation",
    description: "Card mint histories for the Escalation set, with foils and lucky winners.",
  },
  {
    label: "Foundation Starlight Mint History",
    shortLabel: "Foundation - Starlight",
    href: `${JACKPOT_BASE}/starlight-mint-history`,
    icon: edition_starlight_icon_url,
    alt: "Starlight",
    description: "Card mint histories for the Starlight set, with foils and lucky winners.",
  },
  {
    label: "Foundation Extra Mint History",
    shortLabel: "Foundation - Extra",
    href: `${JACKPOT_BASE}/frontier-extra-mint-history`,
    icon: edition_foundation_icon_url,
    alt: "Frontier Extra Mint History",
    description: "Recent winners and mint history of the frontier extra cards.",
  },
  {
    label: "Land Mint History",
    shortLabel: "Land",
    href: `${JACKPOT_BASE}/land-mint-history`,
    icon: edition_land_card_icon_url,
    alt: "Land",
    description: "Cards minted through land, with mint numbers and foil statistics.",
  },
];

export const jackpotItems: JackpotNavItem[] = [
  {
    label: "Jackpot Prizes",
    shortLabel: "Chest Jackpots",
    href: `${JACKPOT_BASE}/jackpot-prizes-chests`,
    icon: jackpot_icon_url,
    alt: "Jackpot",
    description: "What is left in the chest jackpot buckets: skins, music, foils and more.",
  },
  {
    label: "Jackpot CA Gold Rewards",
    shortLabel: "CA Gold Rewards",
    href: `${JACKPOT_BASE}/ca-gold-rewards`,
    icon: edition_conclave_rewards_icon_url,
    alt: "CA Gold Rewards",
    description: "Conclave Arcana gold reward card prizes, by rarity and remaining quantity.",
    color: "#FFD700",
  },

  {
    label: "Foundation Extra Rewards",
    shortLabel: "Foundation - Extra",
    href: `${JACKPOT_BASE}/frontier-extra-rewards`,
    icon: edition_conclave_extra_icon_url,
    alt: "Frontier Extra",
    description: "What is left in the Frontier Extra and Vanguard reward buckets.",
  },
];

export const fortuneDrawItems: JackpotNavItem[] = [
  {
    label: "Fortune Draw Winners",
    shortLabel: "Fortune Winners",
    href: `${JACKPOT_BASE}/fortune-winners`,
    icon: ranked_icon_url,
    alt: "Fortune Draw Winners",
    description: "Who won what: the lucky winners of the fortune draws.",
  },
  {
    label: "Ranked Reward Draws",
    shortLabel: "Ranked Draws",
    href: `${JACKPOT_BASE}/ranked-reward-draws`,
    icon: ranked_icon_url,
    alt: "Ranked Draws",
    description: "Cards in the ranked reward draws, with mint info and foil statistics.",
  },
  {
    label: "Frontier Reward Draws",
    shortLabel: "Frontier Draws",
    href: `${JACKPOT_BASE}/frontier-reward-draws`,
    icon: frontier_icon_url,
    alt: "Frontier Draws",
    description: "Cards in the frontier reward draws, with mint info and foil statistics.",
  },
];

export const jackpotNavGroups: JackpotNavGroup[] = [
  {
    key: "jackpot",
    title: "Jackpot Prizes",
    subtitle: "What is up for grabs and who already won it",
    icon: <GiChest />,
    items: jackpotItems,
  },
  {
    key: "fortune-draws",
    title: "Fortune Draws",
    subtitle: "The cards in the ranked and frontier draws, and who won them",
    icon: <MdCasino />,
    items: fortuneDrawItems,
  },
  {
    key: "mint-history",
    title: "Mint History",
    subtitle: "Every minted card per set, with foils and owners",
    icon: <MdHistory />,
    items: mintHistoryItems,
  },
];
