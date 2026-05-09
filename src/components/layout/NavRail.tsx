import { NavLink } from "react-router-dom";
import { Home, MapPin, Map as MapIcon, FileText, Settings as SettingsIcon } from "lucide-react";

type NavItemDef = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ size: number; "aria-hidden"?: boolean }>;
  end: boolean;
};

const TOP_ITEMS: NavItemDef[] = [
  { to: "/", label: "Home", Icon: Home, end: true },
  { to: "/sites", label: "Sites", Icon: MapPin, end: false },
  { to: "/map", label: "Map", Icon: MapIcon, end: false },
  { to: "/licences", label: "Licences", Icon: FileText, end: false },
];

const BOTTOM_ITEMS: NavItemDef[] = [
  { to: "/settings", label: "Settings", Icon: SettingsIcon, end: false },
];

function NavItem({ to, label, Icon, end }: NavItemDef) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      aria-label={label}
      className={({ isActive }) =>
        [
          "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
          isActive
            ? "bg-blue-100 text-blue-600"
            : "text-slate-500 hover:bg-slate-200 hover:text-slate-700",
        ].join(" ")
      }
    >
      <Icon size={20} aria-hidden />
    </NavLink>
  );
}

export default function NavRail() {
  return (
    <nav
      aria-label="Main navigation"
      className="flex w-16 flex-col items-center justify-between border-r border-slate-200 bg-slate-50 py-4"
    >
      <div className="flex flex-col items-center gap-2">
        {TOP_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}
