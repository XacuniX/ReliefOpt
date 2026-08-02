import { Card } from "../ui";
import { reports, teams, alerts, inventory } from "../../mockData";

const cards = [
  { label: "Active Incidents", value: reports.filter((r) => r.status !== "Resolved").length, icon: "🚨", trend: "up" },
  { label: "Deployed Teams", value: teams.filter((t) => t.status === "Deployed").length, icon: "🪖", trend: "up" },
  { label: "Critical Alerts", value: alerts.filter((a) => a.severity === "Critical").length, icon: "🔴", trend: "up" },
  { label: "Total Supply Items", value: inventory.reduce((sum, i) => sum + i.qty, 0), icon: "📦", trend: "up" },
  { label: "Pending Requests", value: reports.filter((r) => r.status === "Pending").length, icon: "⏳", trend: "down" },
  { label: "Offline Nodes", value: 2, icon: "📡", trend: "down" },
];

export default function KpiCards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map(({ label, value, icon, trend }) => (
        <Card key={label}>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-2xl leading-none" aria-hidden="true">{icon}</span>
              <p className="text-xl font-bold mt-2 mb-1">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
            </div>
            <span className={`text-sm font-bold ${trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {trend === "up" ? "▲" : "▼"}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
