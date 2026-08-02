import { Button, Badge } from "../ui";
import { offlineQueue } from "../../mockData";
import { RefreshCw } from "lucide-react";

const statusColors = {
  Queued: "amber",
  Syncing: "blue",
  Failed: "red",
};

export default function OfflineQueue() {
  return (
    <div className="space-y-3">
      {offlineQueue.map((entry) => (
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

      <Button variant="outline" className="w-full">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry All
      </Button>
    </div>
  );
}
