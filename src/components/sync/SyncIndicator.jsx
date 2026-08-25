import { useEffect, useState } from "react";
import { useOffline } from "../../context/OfflineContext";
import { useData } from "../../context/DataContext";
import { getStatus } from "../../lib/sync";
import PeerPanel from "./PeerPanel";
import OfflineQueue from "./OfflineQueue";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import Dialog from "../ui/Dialog";
import ApprovalQueue from "./ApprovalQueue";
import { useAuth } from "../../context/AuthContext";
import NearbySyncPanel from "./NearbySyncPanel";
import { isAndroidNearbyAvailable } from "../../lib/nearbySync";
import { operationalEvents } from "../../lib/operationalEvents";

export default function SyncIndicator() {
  const { isOffline, toggleOffline } = useOffline();
  const { pendingCount, lastSyncedAt, syncQueue, drainQueue } = useData();
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("devices");
  const [syncMessage, setSyncMessage] = useState("");
  const androidNearby = isAndroidNearbyAvailable();

  useEffect(() => {
    function openApprovals() {
      if (currentUser?.role !== "central_admin") return;
      setActiveTab("approvals");
      setOpen(true);
    }

    window.addEventListener("reliefopt:open-approvals", openApprovals);
    return () => window.removeEventListener("reliefopt:open-approvals", openApprovals);
  }, [currentUser?.role]);

  useEffect(() => operationalEvents.subscribe((event) => {
    if (event.name?.startsWith("sync.") && event.type === "operation.failed") {
      setSyncMessage("Last sync attempt failed; queued changes are safe on this device.");
    }
    if (event.name?.startsWith("sync.") && event.type === "operation.succeeded") {
      setSyncMessage("");
    }
  }), []);

  const status = getStatus(isOffline, pendingCount);

  const config = {
    online: {
      dot: "bg-green-500",
      icon: <Wifi className="h-3.5 w-3.5" />,
      text: lastSyncedAt
        ? `Online – synced ${formatTime(lastSyncedAt)}`
        : "Online",
      textColor: "text-green-700 dark:text-green-400",
      iconBg: "bg-green-500/10",
    },
    pending: {
      dot: "bg-amber-500",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      text: `Sync Pending – ${pendingCount} change${pendingCount !== 1 ? "s" : ""} queued`,
      textColor: "text-amber-700 dark:text-amber-400",
      iconBg: "bg-amber-500/10",
    },
    offline: {
      dot: "bg-red-500",
      icon: <WifiOff className="h-3.5 w-3.5" />,
      text: "Offline Mode",
      textColor: "text-red-700 dark:text-red-400",
      iconBg: "bg-red-500/10",
    },
  };

  const s = config[status];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20 shadow-lg shadow-teal-900/5 dark:shadow-black/30 flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all hover:border-teal-500/40 cursor-pointer"
        aria-label="Sync status"
      >
        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
        <span className={`text-xs font-medium ${s.textColor}`}>{s.text}</span>
      </button>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Sync & Connectivity">
        <div className="space-y-4">
          {syncMessage && <p role="status" className="rounded-md bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">{syncMessage}</p>}
          {!androidNearby && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Manually simulate connectivity for offline field work.</p>
              <button type="button" className="rounded-md border px-3 py-1.5 text-xs font-semibold" onClick={toggleOffline}>
                Simulate {isOffline ? "Online" : "Offline"}
              </button>
            </div>
          )}
          <div className="flex gap-2">
            {[
              { key: "devices", label: androidNearby ? "Nearby Offline Sync" : "Nearby Devices" },
              { key: "queue", label: "Offline Queue" },
              ...(currentUser?.role === "central_admin" ? [{ key: "approvals", label: "Approvals" }] : []),
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "devices" && (androidNearby ? <NearbySyncPanel /> : <PeerPanel />)}
          {activeTab === "queue" && (
            <OfflineQueue
              queue={syncQueue}
              onRetryAll={() => drainQueue()}
              lastSyncedAt={lastSyncedAt}
            />
          )}
          {activeTab === "approvals" && <ApprovalQueue />}
        </div>
      </Dialog>
    </>
  );
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
