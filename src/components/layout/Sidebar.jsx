import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Map, FileText, Pencil, Package,
  CheckSquare, Truck, Users, Settings, Sun, Moon,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { ROUTES } from "../../routes";
import RoleGate from "../RoleGate";
import Avatar from "../ui/Avatar";
import Tooltip from "../ui/Tooltip";
import { cn } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

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

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const isActive = (route) => location.pathname.startsWith(route);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed top-0 left-0 bottom-0 bg-sidebar z-30 transition-all duration-200 overflow-y-auto",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn(
        "flex items-center border-b border-sidebar-border",
        collapsed ? "justify-center px-2 h-14" : "px-5 h-16"
      )}>
        {collapsed ? (
          <span className="text-lg font-bold text-primary">RO</span>
        ) : (
          <span className="text-lg font-bold text-sidebar-foreground">
            Relief<span className="text-primary">Opt</span>
          </span>
        )}
      </div>

      <nav className="flex-1 py-2 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = isActive(item.route);
          const Icon = item.icon;

          const linkContent = (
            <Link
              to={item.route}
              className={cn(
                "flex items-center gap-3 mx-2 rounded-md transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );

          const wrappedLink = collapsed ? (
            <Tooltip key={item.route} content={item.label}>
              {linkContent}
            </Tooltip>
          ) : (
            linkContent
          );

          if (item.roles) {
            return (
              <RoleGate key={item.route} allowed={item.roles}>
                {wrappedLink}
              </RoleGate>
            );
          }

          return wrappedLink;
        })}
      </nav>

      <div className={cn(
        "border-t border-sidebar-border",
        collapsed ? "p-2" : "p-3"
      )}>
        <div className={cn(
          "flex items-center gap-2 mb-2",
          collapsed && "justify-center"
        )}>
          <Avatar name={currentUser.name} size="sm" className="shrink-0" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{currentUser.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate capitalize">{currentUser.role.replace(/_/g, " ")}</p>
            </div>
          )}
        </div>
        <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "")}>
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
