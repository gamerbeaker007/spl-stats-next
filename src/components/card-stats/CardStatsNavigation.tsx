"use client";

import PageNavTabs from "@/components/ui/PageNavTabs";
import { MdAutoGraph, MdFireplace, MdGridOn, MdTableRows } from "react-icons/md";

const TABS = [
  { label: "Distribution", href: "/card-stats", icon: <MdGridOn size={18} /> },
  { label: "Detailed", href: "/card-stats/detailed", icon: <MdTableRows size={18} /> },
  { label: "Burned BCX", href: "/card-stats/burned", icon: <MdFireplace size={18} /> },
  { label: "CP Analysis", href: "/card-stats/cp", icon: <MdAutoGraph size={18} /> },
];

export default function CardStatsNavigation() {
  return <PageNavTabs tabs={TABS} />;
}
