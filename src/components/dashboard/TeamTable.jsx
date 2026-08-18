import { useState, useMemo } from "react";
import { Badge, Card } from "../ui";
import { teams } from "../../mockData";

const statusColors = { Deployed: "green", Standby: "amber", Offline: "grey" };

const columns = [
  { key: "id", label: "Team ID" },
  { key: "leader", label: "Leader" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
  { key: "lastSync", label: "Last Sync" },
  { key: "activeTask", label: "Assigned Task" },
];

export default function TeamTable() {
  const [sort, setSort] = useState({ key: "id", direction: "asc" });

  const sorted = useMemo(() => {
    return [...teams].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      const cmp = typeof aVal === "number" ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [sort]);

  function toggleSort(key) {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <section aria-label="Team deployment status">
      <h2 className="text-lg font-bold mb-3">Team Deployment Status</h2>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/60">
                {columns.map(({ key, label }) => (
                  <th key={key} scope="col" className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white transition-colors"
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
              {sorted.map((team) => (
                <tr key={team.id} className="border-t border-slate-200 dark:border-border hover:bg-slate-100/70 dark:hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{team.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-300">{team.leader}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{team.location}</td>
                  <td className="px-4 py-3">
                    <Badge color={statusColors[team.status]} text={team.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{team.lastSync || "N/A"}</td>
                  <td className="px-4 py-3 max-w-[240px] text-slate-700 dark:text-slate-300">{team.activeTask || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
