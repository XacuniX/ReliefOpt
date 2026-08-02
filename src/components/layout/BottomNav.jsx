import { Link, useLocation } from "react-router-dom";
import { Map, FileText, CheckSquare, Settings } from "lucide-react";
import { ROUTES } from "../../routes";
import { cn } from "../../lib/utils";

const bottomItems = [
  { label: "Map", route: ROUTES.MAP, icon: Map },
  { label: "Reports", route: ROUTES.REPORTS, icon: FileText },
  { label: "Tasks", route: ROUTES.TASKS, icon: CheckSquare },
  { label: "Settings", route: ROUTES.SETTINGS, icon: Settings },
];

export default function BottomNav() {
  const location = useLocation();
  const isActive = (route) => location.pathname.startsWith(route);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t flex justify-around items-center z-20 pb-[env(safe-area-inset-bottom,0)]">
      {bottomItems.map((item) => {
        const active = isActive(item.route);
        const Icon = item.icon;
        return (
          <Link
            key={item.route}
            to={item.route}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
