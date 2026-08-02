import { useState } from "react";
import { Button, Badge, Toast } from "../ui";
import { offlineQueue as initialQueue } from "../../mockData";
import { RefreshCw } from "lucide-react";

const statusColors = {
  Queued: "amber",
  Syncing: "blue",
  Failed: "red",
};

export default function OfflineQueue() {
  const [queue, setQueue] = useState(initialQueue);
  const [retrying, setRetrying] = useState(false);
  const [toast, setToast] = useState(null);

  function handleRetryAll() {
    setRetrying(true);
    setQueue((prev) => prev.map((e) => ({ ...e, status: "Syncing" })));
    setTimeout(() => {
      setQueue((prev) => prev.map((e) => {
        const succeeded = e.status === "Failed" ? Math.random() > 0.3 : true;
        return { ...e, status: succeeded ? "Queued" : "Failed" };
      }));
      setRetrying(false);
      setToast({ type: "success", message: "Retry complete. Changes queued for sync." });
      setTimeout(() => setToast(null), 3000);
    }, 2000);
  }

  return (
    <div className="space-y-3">
      {queue.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-foreground">
                {entry.actionType}
              </span>
              <Badge
                color={statusColors[entry.status] || "grey"}
                text={entry.status}
              />
            </div>
            <p className="text-xs text-muted-foreground">{entry.details}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(entry.timestamp).toLocaleString([], {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          </div>
        </div>
      ))}

      <Button variant="outline" className="w-full" onClick={handleRetryAll} disabled={retrying}>
        <RefreshCw className={`h-4 w-4 mr-2 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? "Retrying..." : "Retry All"}
      </Button>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
