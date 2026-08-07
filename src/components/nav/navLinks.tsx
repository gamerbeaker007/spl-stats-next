import { GiChest, GiCrossedSwords } from "react-icons/gi";
import {
  MdAccountBalance,
  MdAdminPanelSettings,
  MdBarChart,
  MdDashboard,
  MdGridOn,
  MdHome,
  MdMap,
  MdPeople,
  MdRssFeed,
  MdShowChart,
} from "react-icons/md";
import { TbCardsFilled } from "react-icons/tb";

export interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  target?: string;
}

export const navLinks: NavLink[] = [
  { href: "/", label: "Home", icon: <MdHome size={22} /> },
  { href: "/jackpot-prizes", label: "Jackpot Prizes", icon: <GiChest size={22} /> },
  { href: "/multi-dashboard", label: "Multi Dashboard", icon: <MdDashboard size={22} /> },
  { href: "/collection", label: "Collection Management", icon: <TbCardsFilled size={22} /> },
  { href: "/season", label: "Season Overview", icon: <MdBarChart size={22} /> },
  { href: "/battles", label: "Battles", icon: <GiCrossedSwords size={22} /> },
  { href: "/card-stats", label: "Card Stats", icon: <MdGridOn size={22} /> },
  { href: "/portfolio", label: "Portfolio", icon: <MdAccountBalance size={22} /> },
  { href: "/hive-blog", label: "Hive Blog", icon: <MdRssFeed size={22} /> },
  { href: "/spl-metrics", label: "SPL Metrics", icon: <MdShowChart size={22} /> },
  { href: "/users", label: "Users", icon: <MdPeople size={22} /> },
  {
    href: "https://land.spl-stats.com",
    label: "Land",
    icon: <MdMap size={22} />,
    target: "_blank",
  },
  { href: "/admin", label: "Admin", icon: <MdAdminPanelSettings size={22} /> },
];

export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
