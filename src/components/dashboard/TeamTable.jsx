import { useState, useMemo } from "react";
import { Badge, Card } from "../ui";
import { teams } from "../../mockData";

const statusColors = { Deployed: "green", Standby: "amber", Offline: "grey" };
const rowTint = { Deployed: "rgba(39,174,96,.04)", Standby: "rgba(243,156,18,.04)", Offline: "rgba(189,195,199,.06)" };

const columns = [
  { key: "id", label: "Team ID" },
  { key: "leader", label: "Leader" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
  { key: "lastSync", label: "Last Sync" },
  { key: "activeTask", label: "Assigned Task" },
];

const headerStyle = {
  background: "#F8FAFC",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  padding: "12px 16px",
  textAlign: "left",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};

const sortBtn = {
  background: "transparent",
  border: "none",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  fontSize: 12,
  fontWeight: 700,
  padding: 0,
};

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
      <h2 style={{ fontSize: "var(--text-lg)", margin: "0 0 var(--space-3)" }}>Team Deployment Status</h2>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 780, width: "100%" }}>
            <thead>
              <tr>
                {columns.map(({ key, label }) => (
                  <th key={key} scope="col" style={headerStyle}>
                    <button type="button" onClick={() => toggleSort(key)} style={sortBtn}>
                      {label}{sort.key === key ? (sort.direction === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((team) => (
                <tr key={team.id} style={{ background: rowTint[team.status] || "transparent" }}>
                  <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px", whiteSpace: "nowrap" }}>{team.id}</td>
                  <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px", fontWeight: 600 }}>{team.leader}</td>
                  <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px" }}>{team.location}</td>
                  <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px" }}>
                    <Badge color={statusColors[team.status]} text={team.status} />
                  </td>
                  <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px", whiteSpace: "nowrap" }}>
                    {team.lastSync || "N/A"}
                  </td>
                  <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px", maxWidth: 240 }}>
                    {team.activeTask || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
