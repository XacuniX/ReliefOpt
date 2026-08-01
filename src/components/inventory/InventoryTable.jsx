import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Select } from "../ui";

const columns = [
  ["id", "Item ID"],
  ["name", "Name"],
  ["category", "Category"],
  ["qty", "Qty"],
  ["unit", "Unit"],
  ["warehouse", "Warehouse"],
  ["lastUpdated", "Last Updated"],
  ["status", "Status"],
];

const categoryColors = { Food: "blue", Medicine: "green", Equipment: "orange", Shelter: "navy" };
const statusColors = { OK: "green", Low: "amber", Critical: "red" };

const styles = {
  filters: { display: "flex", flexWrap: "wrap", gap: 16, margin: "16px 0 0" },
  filter: { flex: "1 1 220px", marginBottom: 0 },
  tableCard: { marginTop: 8, padding: 0, overflow: "hidden" },
  tableWrap: { overflowX: "auto" },
  table: { borderCollapse: "collapse", minWidth: 1050, width: "100%" },
  header: { background: "#f8fafc", padding: "0", textAlign: "left", whiteSpace: "nowrap" },
  sortButton: { background: "transparent", border: "none", color: "#475569", cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", padding: "12px 16px", textTransform: "uppercase", width: "100%", textAlign: "left" },
  cell: { borderTop: "1px solid #e2e8f0", padding: "14px 16px", whiteSpace: "nowrap" },
};

function formatValue(item, column) {
  if (column === "qty") return item.qty.toLocaleString();
  if (column === "lastUpdated") return new Date(item.lastUpdated).toLocaleDateString();
  return item[column];
}

export default function InventoryTable({ activeWarehouse, items, onEdit, highlightItemId }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState({ key: "name", direction: "asc" });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => item.warehouse === activeWarehouse)
      .filter((item) => !query || item.name.toLowerCase().includes(query))
      .filter((item) => !category || item.category === category)
      .sort((a, b) => {
        const left = a[sort.key];
        const right = b[sort.key];
        const comparison = typeof left === "number"
          ? left - right
          : String(left).localeCompare(String(right));
        return sort.direction === "asc" ? comparison : -comparison;
      });
  }, [activeWarehouse, category, items, search, sort]);

  useEffect(() => {
    if (!highlightItemId) return;
    const item = items.find((entry) => entry.id === highlightItemId);
    if (!item) return;
    setSearch(item.name);
    setCategory("");
  }, [highlightItemId, items]);

  useEffect(() => {
    if (!highlightItemId || !rows.some((item) => item.id === highlightItemId)) return;
    const timeout = window.setTimeout(() => {
      document.getElementById(`inventory-row-${highlightItemId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [highlightItemId, rows]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return (
    <>
      <div style={styles.filters}>
        <Input
          label="Search inventory"
          placeholder="Search by item name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={styles.filter}
        />
        <Select
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={[
            { value: "", label: "All categories" },
            ...Object.keys(categoryColors).map((value) => ({ value, label: value })),
          ]}
          style={styles.filter}
        />
      </div>

      <Card style={styles.tableCard}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {columns.map(([key, label]) => (
                  <th key={key} scope="col" style={styles.header} aria-sort={sort.key === key ? `${sort.direction}ending` : "none"}>
                    <button type="button" onClick={() => toggleSort(key)} style={styles.sortButton}>
                      {label}{sort.key === key ? (sort.direction === "asc" ? " ▲" : " ▼") : ""}
                    </button>
                  </th>
                ))}
                <th scope="col" style={{ ...styles.header, padding: "12px 16px", color: "#475569", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} id={`inventory-row-${item.id}`} style={item.id === highlightItemId ? { background: "rgba(243, 156, 18, 0.20)", outline: "2px solid var(--color-amber)" } : undefined}>
                  <td style={styles.cell}>{item.id}</td>
                  <td style={{ ...styles.cell, fontWeight: 600 }}>{item.name}</td>
                  <td style={styles.cell}><Badge color={categoryColors[item.category]} text={item.category} /></td>
                  <td style={styles.cell}>{item.qty.toLocaleString()}</td>
                  <td style={styles.cell}>{item.unit}</td>
                  <td style={styles.cell}>{item.warehouse}</td>
                  <td style={styles.cell}>{formatValue(item, "lastUpdated")}</td>
                  <td style={styles.cell}><Badge color={statusColors[item.status]} text={item.status} /></td>
                  <td style={styles.cell}><Button size="sm" variant="ghost" onClick={() => onEdit(item)}>Edit</Button></td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={9} style={{ ...styles.cell, color: "#64748b", textAlign: "center" }}>No inventory items match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
