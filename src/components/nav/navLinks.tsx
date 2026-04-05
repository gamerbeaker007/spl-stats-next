import { GiChest, GiCrossedSwords } from "react-icons/gi";
import {
  MdAdminPanelSettings,
  MdAccountBalance,
  MdBarChart,
  MdDashboard,
  MdHome,
  MdPeople,
} from "react-icons/md";

export interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export const navLinks: NavLink[] = [
  { href: "/", label: "Home", icon: <MdHome size={22} /> },
  { href: "/jackpot-prizes", label: "Jackpot Prizes", icon: <GiChest size={22} /> },
  { href: "/multi-dashboard", label: "Multi Dashboard", icon: <MdDashboard size={22} /> },
  { href: "/season", label: "Season Overview", icon: <MdBarChart size={22} /> },
  { href: "/battles", label: "Battles", icon: <GiCrossedSwords size={22} /> },
  { href: "/portfolio", label: "Portfolio", icon: <MdAccountBalance size={22} /> },
  { href: "/users", label: "Users", icon: <MdPeople size={22} /> },
  { href: "/admin", label: "Admin", icon: <MdAdminPanelSettings size={22} /> },
];

export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
