import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Map, FileText, CheckSquare, Package, LogOut } from "lucide-react";
import { ROUTES } from "../../routes";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

const bottomItems = [
  { label: "Dashboard", route: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: "Map", route: ROUTES.MAP, icon: Map },
  { label: "Reports", route: ROUTES.REPORTS, icon: FileText },
  { label: "Tasks", route: ROUTES.TASKS, icon: CheckSquare },
  { label: "Inventory", route: ROUTES.INVENTORY, icon: Package },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isActive = (route) => location.pathname.startsWith(route);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 glass-card rounded-none border-t border-teal-500/15 flex justify-around items-center z-20 pb-[env(safe-area-inset-bottom,0)]">
      {bottomItems.map((item) => {
        const active = isActive(item.route);
        const Icon = item.icon;
        return (
          <Link
            key={item.route}
            to={item.route}
            className={cn(
              "flex flex-col items-center gap-0.5 px-1 py-0.5 text-[10px] font-semibold transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={() => { logout(); navigate("/login"); }}
        className="flex flex-col items-center gap-0.5 px-1 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-red-400 transition-colors"
        aria-label="Sign out"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Sign Out
      </button>
    </nav>
  );
}
