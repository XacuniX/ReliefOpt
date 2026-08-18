import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { BadgeCheck, AlertTriangle, Users, Package } from "lucide-react";
import { reports, teams, alerts, inventory } from "../mockData";
import { useTheme } from "../context/ThemeContext";

const lightColors = ["#0d9488", "#f59e0b", "#0369a1", "#e53e3e", "#6b7280"];
const darkColors = ["#2dd4bf", "#f59e0b", "#38bdf8", "#f75555", "#8895a9"];

const severityStyles = {
  Critical: "border-red-500",
  High: "border-amber-500",
  Medium: "border-teal-500",
};

function KpiCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`rounded-lg p-2 ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

export function Dashboard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chartColors = isDark ? darkColors : lightColors;
  const [visibleAlerts, setVisibleAlerts] = useState(alerts);

  const kpis = useMemo(
    () => [
      { label: "Active Incidents", value: reports.filter((r) => r.status !== "Resolved").length, icon: AlertTriangle, accent: "bg-red-500/10 text-red-500" },
      { label: "Deployed Teams", value: teams.filter((t) => t.status === "Deployed").length, icon: Users, accent: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
      { label: "Supply Items", value: inventory.reduce((sum, i) => sum + i.qty, 0), icon: Package, accent: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
      { label: "Resolved Reports", value: reports.filter((r) => r.status === "Resolved").length, icon: BadgeCheck, accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    ],
    []
  );

  const barData = useMemo(() => {
    const warehouses = ["Warehouse A", "Warehouse B", "Warehouse C", "Warehouse D", "Warehouse E"];
    return warehouses.map((wh) => ({
      name: wh,
      supplies: inventory.filter((i) => i.warehouse === wh).reduce((sum, i) => sum + i.qty, 0),
    }));
  }, []);

  const pieData = useMemo(() => {
    const counts = {};
    reports.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Real-time relief operations overview</p>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Supply Distribution by Warehouse</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1f2a3d" : "#e0e4ea"} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? "#8895a9" : "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? "#8895a9" : "#6b7280" }} />
              <Tooltip
                contentStyle={{
                  background: isDark ? "#111827" : "#fff",
                  border: `1px solid ${isDark ? "#1f2a3d" : "#e0e4ea"}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="supplies" fill={isDark ? "#2dd4bf" : "#0d9488"} radius={[4, 4, 0, 0]} name="Supply Qty" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Incidents by Type</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: isDark ? "#111827" : "#fff",
                  border: `1px solid ${isDark ? "#1f2a3d" : "#e0e4ea"}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live alerts */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Live Alerts</h3>
        {visibleAlerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No new alerts</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleAlerts.map((alert) => {
              const borderColor = severityStyles[alert.severity] || "border-border";
              return (
                <div key={alert.id} className={`border-l-[3px] ${borderColor} rounded-r-md bg-muted/40 p-3`}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{alert.location}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        alert.severity === "Critical"
                          ? "bg-red-500/10 text-red-500"
                          : alert.severity === "High"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground/80">{alert.message}</p>
                  <button
                    onClick={() => setVisibleAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                    className="mt-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    Acknowledge
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
