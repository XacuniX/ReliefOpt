import { useMemo, useState } from "react";
import { useData } from "../../context/DataContext";
import { Badge, Card } from "../ui";

const statusColors = { Deployed: "green", Standby: "amber", Offline: "grey" };
const columns = [
  { key: "id", label: "Team ID" }, { key: "leader", label: "Leader" },
  { key: "location", label: "Location" }, { key: "status", label: "Status" },
  { key: "activeTask", label: "Assigned Task" },
];

export default function TeamTable() {
  const { teams } = useData();
  const [sort, setSort] = useState({ key: "id", direction: "asc" });
  const sorted = useMemo(() => [...teams].sort((left, right) => {
    const comparison = String(left[sort.key] || "").localeCompare(String(right[sort.key] || ""));
    return sort.direction === "asc" ? comparison : -comparison;
  }), [teams, sort]);

  function toggleSort(key) {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  }

  return (
    <section aria-label="Team deployment status">
      <h2 className="text-lg font-bold mb-3">Team Deployment Status</h2>
      <Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm">
        <thead><tr className="bg-slate-100 dark:bg-slate-800/60">{columns.map(({ key, label }) => (
          <th key={key} className="px-4 py-3 text-left"><button type="button" onClick={() => toggleSort(key)} className="text-xs font-bold uppercase tracking-wider">{label}{sort.key === key ? (sort.direction === "asc" ? " ▲" : " ▼") : ""}</button></th>
        ))}</tr></thead>
        <tbody>{sorted.map((team) => <tr key={team.id} className="border-t">
          <td className="px-4 py-3">{team.id}</td><td className="px-4 py-3 font-semibold">{team.leader}</td>
          <td className="px-4 py-3">{team.location}</td><td className="px-4 py-3"><Badge color={statusColors[team.status]} text={team.status} /></td>
          <td className="px-4 py-3">{team.activeTask || "—"}</td>
        </tr>)}</tbody>
      </table></div></Card>
    </section>
  );
}
