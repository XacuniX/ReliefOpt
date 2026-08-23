import { useEffect, useState } from "react";
import { WifiOff, X } from "lucide-react";
import { useOffline } from "../../context/OfflineContext";
import { useData } from "../../context/DataContext";

export default function OfflineBanner() {
  const { isOffline } = useOffline();
  const { lastSyncedAt } = useData();
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { if (isOffline) setDismissed(false); }, [isOffline]);
  if (!isOffline || dismissed) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-[1001] bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-amber-500" />
        <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
          Offline Mode — Showing cached map tiles. Last synced: {lastSyncedAt
            ? new Date(lastSyncedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
            : "not yet"}.
        </span>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-500 hover:text-amber-700" aria-label="Dismiss offline banner">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
