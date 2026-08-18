import { useState } from "react";
import { useOffline } from "../../context/OfflineContext";
import PeerPanel from "./PeerPanel";
import OfflineQueue from "./OfflineQueue";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";
import Dialog from "../ui/Dialog";

export default function SyncIndicator() {
  const { isOffline } = useOffline();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("devices");

  const status = isOffline ? "offline" : "online";
  const queueCount = 3;

  const config = {
    online: {
      dot: "bg-green-500",
      icon: <Wifi className="h-3.5 w-3.5" />,
      text: "Online – synced 2 min ago",
      textColor: "text-green-700 dark:text-green-400",
      iconBg: "bg-green-500/10",
    },
    pending: {
      dot: "bg-amber-500",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      text: `Sync Pending – ${queueCount} changes queued`,
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
          <div className="flex gap-2">
            {[
              { key: "devices", label: "Nearby Devices" },
              { key: "queue", label: "Offline Queue" },
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

          {activeTab === "devices" && <PeerPanel />}
          {activeTab === "queue" && <OfflineQueue />}
        </div>
      </Dialog>
    </>
  );
}
