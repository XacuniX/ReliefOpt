import { useState } from "react";
import { Button, Toast, Loader, Badge } from "../ui";
import { peerDevices } from "../../mockData";
import { Wifi, WifiHigh, WifiLow, SignalMedium } from "lucide-react";

const signalIcons = {
  High: WifiHigh,
  Medium: SignalMedium,
  Low: WifiLow,
};

export default function PeerPanel() {
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  function handleShareData() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setToast({ type: "success", message: "Data shared with 2 nearby devices!" });
      setTimeout(() => setToast(null), 3000);
    }, 2000);
  }

  return (
    <div className="space-y-3">
      {peerDevices.map((device) => {
        const Icon = signalIcons[device.signalStrength] || Wifi;
        return (
          <div
            key={device.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
          >
            <div className="h-10 w-10 rounded-full bg-card border flex items-center justify-center">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{device.deviceName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  color={
                    device.signalStrength === "High"
                      ? "green"
                      : device.signalStrength === "Medium"
                      ? "amber"
                      : "red"
                  }
                  text={device.signalStrength}
                />
                <Badge
                  color={device.status === "Available" ? "teal" : "grey"}
                  text={device.status}
                />
              </div>
            </div>
            <Button size="sm" variant="outline" className="shrink-0">
              Connect
            </Button>
          </div>
        );
      })}

      <Button
        className="w-full"
        onClick={handleShareData}
        disabled={syncing}
      >
        {syncing ? (
          <>
            <Loader size="sm" className="mr-2" />
            Sharing...
          </>
        ) : (
          "Share Data"
        )}
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
