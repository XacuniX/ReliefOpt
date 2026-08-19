import { useState } from "react";
import { Button, Badge, Toast } from "../ui";
import { RefreshCw } from "lucide-react";
import { useData } from "../../context/DataContext";

const statusColors = {
  Queued: "amber",
  Syncing: "blue",
  Done: "green",
  Failed: "red",
};

function describeEntry(entry) {
  const p = entry.payload || {};
  switch (entry.actionType) {
    case "ADD_REPORT":
      return `New report — ${p.district || "Unknown"}`;
    case "UPDATE_REPORT":
      return `Report ${p.id || ""} updated`;
    case "ADD_TASK":
      return `New task — ${p.title || "Untitled"}`;
    case "MOVE_TASK":
      return `Task ${p.id || ""} → ${p.status || "?"}`;
    case "UPDATE_ITEM_QTY":
      return `Stock change — ${p.itemId || "?"} ${p.delta > 0 ? "+" : ""}${p.delta} (${p.reason || "no reason"})`;
    case "ADD_MAP_PIN":
      return `Map pin — ${p.location || "Unknown"}`;
    default:
      return `${entry.actionType || "Unknown action"}`;
  }
}

export default function OfflineQueue({ queue = [], onRetryAll, lastSyncedAt }) {
  const { pendingCount } = useData();
  const [toast, setToast] = useState(null);
  const [retrying, setRetrying] = useState(false);

  function handleRetryAll() {
    setRetrying(true);
    Promise.resolve(onRetryAll?.()).finally(() => {
      setRetrying(false);
      setToast({ type: "success", message: "Queue drained." });
      setTimeout(() => setToast(null), 3000);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {pendingCount} pending change{pendingCount !== 1 ? "s" : ""}
          {lastSyncedAt &&
            ` · last synced ${new Date(lastSyncedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`}
        </p>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing queued. Go offline (DevTools → Network → Offline) and make a change — it
          will land here and drain automatically when you come back online.
        </p>
      ) : (
        queue.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-foreground">
                  {describeEntry(entry)}
                </span>
                <Badge color={statusColors[entry.status] || "grey"} text={entry.status} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(entry.timestamp).toLocaleString([], {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
        ))
      )}

      {queue.length > 0 && (
        <Button variant="outline" className="w-full" onClick={handleRetryAll} disabled={retrying}>
          <RefreshCw className={`h-4 w-4 mr-2 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Draining..." : "Retry All"}
        </Button>
      )}

      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
