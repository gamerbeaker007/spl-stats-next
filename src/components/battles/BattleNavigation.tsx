"use client";

import PageNavTabs from "@/components/ui/PageNavTabs";
import { MdCreditCard, MdEmojiEvents, MdPersonOff, MdTrendingDown } from "react-icons/md";

const TABS = [
  { label: "Best Cards", href: "/battles", icon: <MdEmojiEvents size={18} /> },
  { label: "Losing Cards", href: "/battles/losing", icon: <MdTrendingDown size={18} /> },
  { label: "Nemesis", href: "/battles/nemesis", icon: <MdPersonOff size={18} /> },
  { label: "Card Detail", href: "/battles/card", icon: <MdCreditCard size={18} /> },
];

export default function BattleNavigation() {
  return <PageNavTabs tabs={TABS} />;
}
