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
  ClipboardCheck,
  Settings,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ROUTES } from "../routes";
import RoleGate from "./RoleGate";
import SyncIndicator from "./sync/SyncIndicator";
import { NotificationPopover } from "./ui/notification-popover";
import { SmokeyBackground } from "./ui/login-form";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { usePreferences } from "../context/PreferencesContext";

const { Link, useLocation, useNavigate, Outlet } = ReactRouter;

const navItems = [
  { key: "dashboard", route: ROUTES.DASHBOARD, icon: LayoutDashboard, roles: ["central_admin", "warehouse_manager"] },
  { key: "map", route: ROUTES.MAP, icon: Map, roles: null },
  { key: "reports", route: ROUTES.REPORTS, icon: FileText, roles: null },
  { key: "submitReport", route: ROUTES.SUBMIT_REPORT, icon: Pencil, roles: null },
  { key: "inventory", route: ROUTES.INVENTORY, icon: Package, roles: ["central_admin", "warehouse_manager"] },
  { key: "tasks", route: ROUTES.TASKS, icon: CheckSquare, roles: null },
  { key: "cargo", route: ROUTES.CARGO, icon: Truck, roles: ["warehouse_manager", "central_admin"] },
  { key: "users", route: ROUTES.USERS, icon: Users, roles: ["central_admin"] },
  { key: "approvals", route: ROUTES.APPROVALS, icon: ClipboardCheck, roles: ["central_admin"] },
  { key: "settings", route: ROUTES.SETTINGS, icon: Settings, roles: null },
];

function NavLink({ item, onNavigate }) {
  const location = useLocation();
  const active =
    location.pathname === item.route ||
    (item.route === ROUTES.DASHBOARD && location.pathname === "/demo");
  const Icon = item.icon;
  const { t } = usePreferences();
  const label = t(item.key);

  const link = (
    <Link
      to={item.route}
      onClick={onNavigate}
      title={label}
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
      <span className="min-w-0 truncate">{label}</span>
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="app-gradient app-safe-area relative flex h-screen overflow-hidden text-foreground antialiased">
      {/* Ambient teal glows */}
      <div
        aria-hidden
        className="glow-blob right-[-10rem] top-[-10rem] h-96 w-96 bg-teal-500/10"
      />
      <div
        aria-hidden
        className="glow-blob bottom-[-12rem] left-[-8rem] h-[28rem] w-[28rem] bg-teal-500/5"
      />

      {/* Smokey animated backdrop (same as login page), theme-tuned for text readability */}
      <div className="absolute inset-0 z-0">
        <SmokeyBackground color="#0d9488" className="pointer-events-none" />
        <div className={`absolute inset-0 ${isDark ? "bg-[#031a17]/80" : "bg-white/60"}`} />
      </div>

      {/* Sidebar */}
      {mobileOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`app-safe-area-sidebar fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-teal-500/10 bg-[#0b1215]/95 backdrop-blur-md transition-transform md:static md:z-10 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 px-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-zinc-950 shadow-[0_0_16px_rgba(20,184,166,0.45)]">
            <Package className="h-4 w-4" />
          </div>
          <span className="flex-1 text-lg font-semibold tracking-tight text-zinc-50">
            Relief<span className="text-teal-400">Opt</span>
          </span>
          <button type="button" aria-label="Close navigation" className="rounded p-1 text-zinc-300 md:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
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
        <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-teal-500/10 bg-background/60 px-3 backdrop-blur-md sm:px-6 md:justify-end">
          <button type="button" aria-label="Open navigation" className="rounded-lg border border-teal-500/20 p-2 md:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="flex min-w-0 items-center gap-2">
          <SyncIndicator />
          <NotificationPopover />
          </div>
        </header>

        {/* Content */}
        <main className="app-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-3 sm:p-6">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
