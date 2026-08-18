import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Siren,
  ShieldCheck,
  AlertCircle,
  Package,
  Hourglass,
  Satellite,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { alerts as mockAlerts } from "../mockData";

/* ── Shared styles ─────────────────────────────────────────────────── */

const statusBadge = {
  Deployed: "bg-teal-100 text-teal-800 ring-1 ring-teal-500/30 dark:bg-teal-500/15 dark:text-teal-400 dark:ring-teal-500/30",
  Standby: "bg-amber-100 text-amber-800 ring-1 ring-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25",
  Offline: "bg-slate-200 text-slate-700 ring-1 ring-slate-400/30 dark:bg-zinc-600/20 dark:text-zinc-400 dark:ring-zinc-600/30",
};

const severityBadge = {
  Critical: "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400",
  High: "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
  Medium: "bg-teal-100 text-teal-800 dark:bg-teal-500/10 dark:text-teal-400",
};

const severityBorder = {
  Critical: "border-l-red-500",
  High: "border-l-amber-500",
  Medium: "border-l-teal-500",
};

const pieColors = {
  Flood: "#14b8a6",
  Cyclone: "#f59e0b",
  Earthquake: "#38bdf8",
  Fire: "#f75555",
  Other: "#94a3b8",
};

const tooltipStyle = {
  background: "rgba(255, 255, 255, 0.95)",
  border: "1px solid rgba(13, 148, 136, 0.25)",
  borderRadius: 8,
  fontSize: 12,
  color: "#1a1d29",
};

/* ── KPI card ──────────────────────────────────────────────────────── */

function KpiCard({ label, value, icon: Icon, trend }) {
  return (
    <div className="group rounded-xl p-5 transition-all hover:border-teal-500/40 bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20 shadow-lg shadow-teal-900/5 dark:shadow-black/30">
      <div className="flex items-start justify-between">
        <span className="rounded-lg bg-teal-500/10 p-2 ring-1 ring-teal-500/20 transition-colors group-hover:bg-teal-500/20">
          <Icon className="h-4 w-4 text-teal-300" />
        </span>
        {trend && (
          <span
            className={`text-sm font-bold ${
              trend === "up" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trend === "up" ? "▲" : "▼"}
          </span>
        )}
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
        {label}
      </p>
    </div>
  );
}

/* ── Card shell (plain glass, grid-safe) ───────────────────────────── */

function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-xl p-6 transition-all hover:border-teal-500/40 bg-white/80 dark:bg-white/10 backdrop-blur-lg border border-teal-500/20 dark:border-white/20 shadow-lg shadow-teal-900/5 dark:shadow-black/30 ${className}`}>
      <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-50">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ── Main dashboard ────────────────────────────────────────────────── */

export function Dashboard() {
  const { ready, reports, teams, inventory } = useData();
  const [visibleAlerts, setVisibleAlerts] = useState([]);
  const [sort, setSort] = useState({ key: "id", direction: "asc" });

  const alerts = useMemo(
    () => (visibleAlerts.length > 0 ? visibleAlerts : mockAlerts),
    [visibleAlerts]
  );

  const kpis = useMemo(
    () => [
      {
        label: "Active Incidents",
        value: reports.filter((r) => r.status !== "Resolved").length,
        icon: Siren,
        trend: "up",
      },
      {
        label: "Deployed Teams",
        value: teams.filter((t) => t.status === "Deployed").length,
        icon: ShieldCheck,
        trend: "up",
      },
      {
        label: "Critical Alerts",
        value: alerts.filter((a) => a.severity === "Critical").length,
        icon: AlertCircle,
      },
      {
        label: "Total Supply Items",
        value: inventory.reduce((sum, i) => sum + i.qty, 0),
        icon: Package,
        trend: "up",
      },
      {
        label: "Pending Requests",
        value: reports.filter((r) => r.status === "Pending").length,
        icon: Hourglass,
        trend: "down",
      },
      {
        label: "Offline Nodes",
        value: 2,
        icon: Satellite,
        trend: "down",
      },
    ],
    [reports, teams, alerts, inventory]
  );

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      const cmp =
        typeof aVal === "number" ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [teams, sort]);

  function toggleSort(key) {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }

  const barData = useMemo(() => {
    const warehouses = ["Warehouse A", "Warehouse B", "Warehouse C", "Warehouse D", "Warehouse E"];
    return warehouses.map((wh) => ({
      name: wh,
      supplies: inventory.filter((i) => i.warehouse === wh).reduce((sum, i) => sum + i.qty, 0),
    }));
  }, [inventory]);

  const pieData = useMemo(() => {
    const counts = {};
    reports.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reports]);

  function acknowledgeAlert(id) {
    setVisibleAlerts((prev) => {
      const current = prev.length > 0 ? prev : alerts;
      return current.filter((a) => a.id !== id);
    });
  }

  /* Loading state */
  if (!ready) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-teal-500/10 bg-slate-200/60 dark:bg-[#0d1317]/80"
            />
          ))}
        </div>
        <p className="py-10 text-center text-sm text-slate-500 dark:text-zinc-500">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. KPI cards — single row of 6 ─────────────────────────── */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </section>

      {/* ── 2. Team table (8/12) + Live alerts (4/12) ──────────────── */}
      <section aria-label="Deployment and alerts" className="my-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Team deployment status */}
          <Card title="Team Deployment Status" className="lg:col-span-8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-teal-500/10">
                    {[
                      ["Team ID", "id"],
                      ["Leader", "leader"],
                      ["Location", "location"],
                      ["Status", "status"],
                      ["Last Sync", "lastSync"],
                      ["Assigned Task", "activeTask"],
                    ].map(([label, key]) => (
                      <th key={key} scope="col" className="px-3 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 transition-colors hover:text-teal-600 dark:hover:text-teal-300"
                        >
                          {label}
                          {sort.key === key && (
                            <span className="ml-1">{sort.direction === "asc" ? "▲" : "▼"}</span>
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.map((team) => (
                    <tr
                      key={team.id}
                      className="border-b border-slate-200 dark:border-teal-500/5 transition-colors hover:bg-teal-500/5"
                    >
                      <td className="px-3 py-3 whitespace-nowrap font-medium text-teal-700 dark:text-teal-300/90">
                        {team.id}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 dark:text-zinc-100">{team.leader}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-zinc-300">{team.location}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            statusBadge[team.status] || "bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300"
                          }`}
                        >
                          {team.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-500 dark:text-zinc-500">
                        {team.lastSync || "N/A"}
                      </td>
                      <td className="px-3 py-3 max-w-[240px] text-slate-600 dark:text-zinc-400">
                        {team.activeTask || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Live alerts feed */}
          <Card title="Live Alerts" className="lg:col-span-4">
            <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-zinc-500">No new alerts</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-r-lg border-l-[3px] bg-slate-50 dark:bg-white/[0.03] p-3 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06] ${
                      severityBorder[alert.severity] || "border-l-slate-400 dark:border-l-zinc-600"
                    }`}
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{alert.location}</span>
                      <span className="text-xs text-slate-500 dark:text-zinc-500">
                        {new Date(alert.timestamp).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          severityBadge[alert.severity] || "bg-slate-200 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-slate-600 dark:text-zinc-400">{alert.message}</p>
                    <button
                      type="button"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="mt-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-teal-600 dark:text-zinc-500 dark:hover:text-teal-300"
                    >
                      Acknowledge
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* ── 3. Analytics — 50/50 charts ────────────────────────────── */}
      <section aria-label="Analytics overview">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Supply Distribution by Warehouse">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    domain={[0, 8000]}
                  />
                  <Tooltip cursor={{ fill: "rgba(20,184,166,0.06)" }} contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="supplies"
                    fill="#14b8a6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                    name="Supply Qty"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Incidents by Type">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    dataKey="value"
                    nameKey="name"
                    paddingAngle={2}
                    stroke="transparent"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={pieColors[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
