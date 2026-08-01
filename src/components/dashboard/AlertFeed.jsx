import { useState } from "react";
import { Badge, Card, Button } from "../ui";
import { alerts as mockAlerts } from "../../mockData";

const severityBorder = {
  Critical: "#C0392B",
  High: "#D4880F",
  Medium: "var(--color-teal)",
};

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  maxHeight: 320,
  overflowY: "auto",
};

const entryStyle = (severity) => ({
  borderLeft: `3px solid ${severityBorder[severity] || "var(--color-mid)"}`,
  padding: "var(--space-3) var(--space-4)",
  background: "var(--color-white)",
  borderRadius: 4,
});

const locationStyle = {
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  color: "var(--color-teal)",
  marginRight: "var(--space-2)",
};

const timeStyle = {
  fontSize: "var(--text-sm)",
  color: "var(--color-mid)",
};

const messageStyle = {
  fontSize: 13,
  margin: "var(--space-2) 0 var(--space-3)",
  lineHeight: 1.5,
};

const headerRow = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "var(--space-2)",
  marginBottom: 2,
};

export default function AlertFeed() {
  const [visibleAlerts, setVisibleAlerts] = useState(mockAlerts);

  function acknowledge(id) {
    setVisibleAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <section aria-label="Alert feed">
      <h2 style={{ fontSize: "var(--text-lg)", margin: "0 0 var(--space-3)" }}>Live Alerts</h2>
      {visibleAlerts.length === 0 ? (
        <Card>
          <p style={{ color: "var(--color-mid)", textAlign: "center", margin: 0, padding: "var(--space-6)" }}>
            No new alerts
          </p>
        </Card>
      ) : (
        <div style={containerStyle}>
          {visibleAlerts.map((alert) => (
            <div key={alert.id} style={entryStyle(alert.severity)}>
              <div style={headerRow}>
                <span style={locationStyle}>{alert.location}</span>
                <span style={timeStyle}>{new Date(alert.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                <Badge
                  color={alert.severity === "Critical" ? "red" : alert.severity === "High" ? "amber" : "teal"}
                  text={alert.severity}
                />
              </div>
              <p style={messageStyle}>{alert.message}</p>
              <Button size="sm" variant="ghost" onClick={() => acknowledge(alert.id)}>
                Acknowledge
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
