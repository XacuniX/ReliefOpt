import { Card } from "../ui";
import { reports, teams, alerts, inventory } from "../../mockData";

const cards = [
  {
    label: "Active Incidents",
    value: reports.filter((r) => r.status !== "Resolved").length,
    icon: "🚨",
    trend: "up",
  },
  {
    label: "Deployed Teams",
    value: teams.filter((t) => t.status === "Deployed").length,
    icon: "🪖",
    trend: "up",
  },
  {
    label: "Critical Alerts",
    value: alerts.filter((a) => a.severity === "Critical").length,
    icon: "🔴",
    trend: "up",
  },
  {
    label: "Total Supply Items",
    value: inventory.reduce((sum, i) => sum + i.qty, 0),
    icon: "📦",
    trend: "up",
  },
  {
    label: "Pending Requests",
    value: reports.filter((r) => r.status === "Pending").length,
    icon: "⏳",
    trend: "down",
  },
  {
    label: "Offline Nodes",
    value: 2,
    icon: "📡",
    trend: "down",
  },
];

const cardInner = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
};

const iconStyle = {
  fontSize: 28,
  lineHeight: 1,
};

const valueStyle = {
  fontSize: "var(--text-2xl)",
  fontWeight: 700,
  margin: "var(--space-2) 0 4px",
};

const labelStyle = {
  fontSize: "var(--text-sm)",
  color: "var(--color-mid)",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  margin: 0,
};

const trendStyle = (direction) => ({
  fontSize: "var(--text-sm)",
  fontWeight: 700,
  color: direction === "up" ? "#1E8449" : "#C0392B",
});

export default function KpiCards() {
  return (
    <section className="kpi-grid" aria-label="Key performance indicators">
      {cards.map(({ label, value, icon, trend }) => (
        <Card key={label}>
          <div style={cardInner}>
            <div>
              <span style={iconStyle} aria-hidden="true">{icon}</span>
              <p style={valueStyle}>{value.toLocaleString()}</p>
              <p style={labelStyle}>{label}</p>
            </div>
            <span style={trendStyle(trend)}>{trend === "up" ? "▲" : "▼"}</span>
          </div>
        </Card>
      ))}
    </section>
  );
}
