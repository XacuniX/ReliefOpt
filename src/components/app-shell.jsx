import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as Avatar from "@radix-ui/react-avatar";
import * as Collapsible from "@radix-ui/react-collapsible";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Separator from "@radix-ui/react-separator";
import {
  LayoutDashboard, Map, FileText, Pencil, Package, CheckSquare, Truck,
  Users, Settings, Sun, Moon, LogOut, ChevronDown, Menu, X, PanelLeftClose
} from "lucide-react";
import { ROUTES } from "../routes";
import RoleGate from "./RoleGate";
import SyncIndicator from "./sync/SyncIndicator";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { label: "Dashboard", route: ROUTES.DASHBOARD, icon: LayoutDashboard, roles: ["central_admin", "warehouse_manager"] },
  { label: "Map", route: ROUTES.MAP, icon: Map, roles: null },
  { label: "Reports", route: ROUTES.REPORTS, icon: FileText, roles: null },
  { label: "Submit Report", route: ROUTES.SUBMIT_REPORT, icon: Pencil, roles: null },
  { label: "Inventory", route: ROUTES.INVENTORY, icon: Package, roles: null },
  { label: "Tasks", route: ROUTES.TASKS, icon: CheckSquare, roles: null },
  { label: "Cargo", route: ROUTES.CARGO, icon: Truck, roles: ["warehouse_manager", "central_admin"] },
  { label: "Users", route: ROUTES.USERS, icon: Users, roles: ["central_admin"] },
  { label: "Settings", route: ROUTES.SETTINGS, icon: Settings, roles: null },
];

function NavLink({ item, collapsed, onNavigate }) {
  const location = useLocation();
  const active = location.pathname.startsWith(item.route);
  const Icon = item.icon;

  const link = (
    <Link
      to={item.route}
      onClick={onNavigate}
      className={`group flex items-center gap-3 mx-2 rounded-lg transition-colors ${
        collapsed ? "justify-center p-2.5" : "px-3 py-2.5"
      } ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
    </Link>
  );

  return item.roles ? <RoleGate allowed={item.roles}>{link}</RoleGate> : link;
}

export function AppShell({ children }) {
  const { currentUser, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate(ROUTES.LOGIN);
  }

  const initials = (currentUser?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className={`flex items-center border-b border-sidebar-border ${collapsed ? "justify-center h-14 px-2" : "h-16 px-5"}`}>
        <span className="text-lg font-bold text-sidebar-foreground">
          Relief<span className="text-primary">Opt</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => (
          <NavLink key={item.route} item={item} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className={`flex items-center gap-2 mb-2 ${collapsed ? "justify-center" : ""}`}>
          <Avatar.Root className="relative inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-full align-middle">
            <Avatar.Image
              src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(currentUser?.name || "User")}`}
              alt={currentUser?.name || "User"}
              className="h-full w-full object-cover"
            />
            <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-primary-foreground">
              {initials}
            </Avatar.Fallback>
          </Avatar.Root>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{currentUser?.name}</p>
              <p className="truncate text-[10px] capitalize text-sidebar-foreground/50">
                {(currentUser?.role || "").replace(/_/g, " ")}
              </p>
            </div>
          )}
        </div>

        <div className={`flex gap-1 ${collapsed ? "flex-col items-center" : ""}`}>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden md:block rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            className="rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-red-400/10 hover:text-red-400"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden md:block transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}>
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <Collapsible.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="md:hidden">
          {mobileOpen && (
            <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
          )}
          <Collapsible.Content className="fixed inset-y-0 left-0 z-50 w-60">
            {sidebarContent}
          </Collapsible.Content>
        </div>
      </Collapsible.Root>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="text-foreground">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <span className="font-bold text-foreground">
          Relief<span className="text-primary">Opt</span>
        </span>
        <div className="ml-auto">
          <SyncIndicator />
        </div>
      </header>

      {/* User menu (desktop) */}
      <div className="fixed right-4 top-4 z-20 hidden md:block">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 shadow-sm transition-colors hover:bg-muted/50">
              <Avatar.Root className="relative inline-flex h-7 w-7 overflow-hidden rounded-full">
                <Avatar.Image
                  src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(currentUser?.name || "User")}`}
                  alt={currentUser?.name || "User"}
                  className="h-full w-full object-cover"
                />
                <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-primary text-[10px] font-bold text-primary-foreground">
                  {initials}
                </Avatar.Fallback>
              </Avatar.Root>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[180px] rounded-lg border border-border bg-card p-1 shadow-lg"
            >
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-foreground">{currentUser?.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{(currentUser?.role || "").replace(/_/g, " ")}</p>
              </div>
              <Separator.Root className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none hover:bg-muted"
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onSelect={handleLogout}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-500 outline-none hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <main className={`transition-all duration-200 md:pt-0 ${collapsed ? "md:pl-16" : "md:pl-60"} pt-14`}>
        <div className="px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
