import { useState } from "react";
import { Badge, Card, Button } from "../ui";
import { alerts as mockAlerts } from "../../mockData";

const severityStyles = {
  Critical: "border-red-500",
  High: "border-amber-500",
  Medium: "border-teal-500",
};

export default function AlertFeed() {
  const [visibleAlerts, setVisibleAlerts] = useState(mockAlerts);

  function acknowledge(id) {
    setVisibleAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <section aria-label="Alert feed">
      <h2 className="text-lg font-bold mb-3">Live Alerts</h2>
      {visibleAlerts.length === 0 ? (
        <Card>
          <p className="text-muted-foreground text-center py-6">No new alerts</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
          {visibleAlerts.map((alert) => {
            const borderColor = severityStyles[alert.severity] || "border-border";

            return (
              <div key={alert.id} className={`border-l-[3px] ${borderColor} bg-slate-50/80 dark:bg-white/5 rounded-r-md p-3`}>
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <span className="text-sm font-semibold text-primary">{alert.location}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <Badge
                    color={alert.severity === "Critical" ? "red" : alert.severity === "High" ? "amber" : "teal"}
                    text={alert.severity}
                  />
                </div>
                <p className="text-[13px] leading-relaxed my-2">{alert.message}</p>
                <Button size="sm" variant="ghost" onClick={() => acknowledge(alert.id)}>
                  Acknowledge
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
