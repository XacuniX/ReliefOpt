import { useAuth } from "../context/AuthContext";
import { useOffline } from "../context/OfflineContext";

const roles = [
  { key: "field_worker", label: "Field Worker" },
  { key: "warehouse_manager", label: "Warehouse Manager" },
  { key: "central_admin", label: "Central Admin" },
];

export default function DemoSwitcher() {
  const { currentUser, login } = useAuth();
  const { isOffline, toggleOffline } = useOffline();

  return (
    <aside className="fixed bottom-4 right-4 z-50 bg-foreground rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Demo Mode</p>
      <div className="mb-2">
        {roles.map(({ key, label }) => {
          const active = currentUser.role === key;
          return (
            <button
              key={key}
              type="button"
              className={`block w-full text-left rounded-md py-1.5 px-2.5 text-xs font-semibold transition-colors mb-1 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-card-foreground hover:bg-primary/20"
              }`}
              onClick={() => login(key)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="border-t border-sidebar-border pt-2">
        <button
          type="button"
          className={`block w-full text-left rounded-md py-1.5 px-2.5 text-xs font-semibold transition-colors ${
            isOffline
              ? "bg-red-500/20 text-red-400"
              : "bg-green-500/20 text-green-400"
          }`}
          onClick={toggleOffline}
        >
          {isOffline ? "⬤ Offline Mode" : "⬤ Online Mode"}
        </button>
      </div>
    </aside>
  );
}
