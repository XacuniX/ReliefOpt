import { useState } from "react";
import * as ReactRouter from "react-router-dom";
import * as Avatar from "@radix-ui/react-avatar";
import {
  LayoutDashboard,
  Map,
  FileText,
  Pencil,
  Package,
  CheckSquare,
  Truck,
  Users,
  Settings,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { ROUTES } from "../routes";
import RoleGate from "./RoleGate";
import SyncIndicator from "./sync/SyncIndicator";
import NotifDrawer from "./notifications/NotifDrawer";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const { Link, useLocation, useNavigate, Outlet } = ReactRouter;

const navItems = [
  { label: "Dashboard", route: ROUTES.DASHBOARD, icon: LayoutDashboard, roles: null },
  { label: "Map", route: ROUTES.MAP, icon: Map, roles: null },
  { label: "Reports", route: ROUTES.REPORTS, icon: FileText, roles: null },
  { label: "Submit Report", route: ROUTES.SUBMIT_REPORT, icon: Pencil, roles: null },
  { label: "Inventory", route: ROUTES.INVENTORY, icon: Package, roles: null },
  { label: "Tasks", route: ROUTES.TASKS, icon: CheckSquare, roles: null },
  { label: "Cargo", route: ROUTES.CARGO, icon: Truck, roles: ["warehouse_manager", "central_admin"] },
  { label: "Users", route: ROUTES.USERS, icon: Users, roles: ["central_admin"] },
  { label: "Settings", route: ROUTES.SETTINGS, icon: Settings, roles: null },
];

function NavLink({ item, onNavigate }) {
  const location = useLocation();
  const active =
    location.pathname === item.route ||
    (item.route === ROUTES.DASHBOARD && location.pathname === "/demo");
  const Icon = item.icon;

  const link = (
    <Link
      to={item.route}
      onClick={onNavigate}
      title={item.label}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
        active
          ? "bg-teal-500/15 font-medium text-teal-200 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.25)]"
          : "text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          active ? "text-teal-400" : "text-zinc-400 group-hover:text-teal-300"
        }`}
      />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );

  return item.roles ? <RoleGate allowed={item.roles}>{link}</RoleGate> : link;
}

function UserFooter() {
  const { currentUser, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const initials = (currentUser?.name || "RU")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN);
  }

  return (
    <div className="flex items-center gap-3 border-t border-teal-500/10 px-4 py-4">
      <Avatar.Root className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-teal-500/20 ring-1 ring-teal-500/30">
        <Avatar.Fallback className="flex h-full w-full items-center justify-center text-xs font-semibold text-teal-300">
          {initials}
        </Avatar.Fallback>
      </Avatar.Root>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{currentUser?.name}</p>
        <p className="truncate text-xs capitalize text-teal-400/70">
          {(currentUser?.role || "").replace(/_/g, " ")}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-teal-500/10 hover:text-teal-300"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-gradient relative flex h-screen overflow-hidden text-foreground antialiased">
      {/* Ambient teal glows */}
      <div
        aria-hidden
        className="glow-blob right-[-10rem] top-[-10rem] h-96 w-96 bg-teal-500/10"
      />
      <div
        aria-hidden
        className="glow-blob bottom-[-12rem] left-[-8rem] h-[28rem] w-[28rem] bg-teal-500/5"
      />

      {/* Sidebar */}
      <aside className="relative z-10 flex w-64 shrink-0 flex-col border-r border-teal-500/10 bg-[#0b1215]/95 backdrop-blur-md">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 px-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-zinc-950 shadow-[0_0_16px_rgba(20,184,166,0.45)]">
            <Package className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-zinc-50">
            Relief<span className="text-teal-400">Opt</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink key={item.route} item={item} onNavigate={() => setMobileOpen(false)} />
          ))}
        </nav>

        {/* User profile footer */}
        <UserFooter />
      </aside>

      {/* Main column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-end gap-3 border-b border-teal-500/10 bg-background/60 pr-16 backdrop-blur-md">
          <SyncIndicator />
          <NotifDrawer />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
