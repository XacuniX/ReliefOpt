import { useState } from "react";
import { useData } from "../../context/DataContext";
import { Badge, Button, Card, Toast } from "../ui";

export default function AlertFeed() {
  const { notifications, markNotificationRead } = useData();
  const [toast, setToast] = useState(null);
  const alerts = notifications.filter((item) => !item.read && ["Critical", "System"].includes(item.type));

  async function acknowledge(id) {
    try {
      await markNotificationRead(id, true);
      setToast({ type: "success", message: "Alert acknowledged." });
    } catch (error) {
      setToast({ type: "error", message: error.message });
    }
  }

  return (
    <section aria-label="Alert feed">
      <h2 className="text-lg font-bold mb-3">Live Alerts</h2>
      {!alerts.length ? (
        <Card><p className="text-muted-foreground text-center py-6">No new alerts</p></Card>
      ) : (
        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
          {alerts.map((alert) => (
            <div key={alert.id} className={`border-l-[3px] ${alert.type === "Critical" ? "border-red-500" : "border-blue-500"} bg-slate-50/80 dark:bg-white/5 rounded-r-md p-3`}>
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <span className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</span>
                <Badge color={alert.type === "Critical" ? "red" : "navy"} text={alert.type} />
              </div>
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-[13px] leading-relaxed my-2">{alert.body}</p>
              <Button size="sm" variant="ghost" onClick={() => acknowledge(alert.id)}>Acknowledge</Button>
            </div>
          ))}
        </div>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />}
    </section>
  );
}
