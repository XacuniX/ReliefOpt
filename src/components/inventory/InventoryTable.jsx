import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Input, Select } from "../ui";

const categoryColors = { Food: "blue", Medicine: "green", Equipment: "orange", Shelter: "navy" };
const statusColors = { OK: "green", Low: "amber", Critical: "red" };

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
        return (typeof left === "number" ? left - right : String(left).localeCompare(String(right)))
          * (sort.direction === "asc" ? 1 : -1);
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
    const timeout = setTimeout(() => {
      document.getElementById(`inv-row-${highlightItemId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    return () => clearTimeout(timeout);
  }, [highlightItemId, rows]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  const headers = [
    ["id", "Item ID"],
    ["name", "Name"],
    ["category", "Category"],
    ["qty", "Qty"],
    ["unit", "Unit"],
    ["warehouse", "Warehouse"],
    ["lastUpdated", "Last Updated"],
    ["status", "Status"],
  ];

  return (
    <>
      <div className="flex flex-wrap gap-4 mt-4">
        <Input
          label="Search inventory"
          placeholder="Search by item name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 min-w-[220px]"
        />
        <Select
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={[
            { value: "", label: "All categories" },
            ...Object.keys(categoryColors).map((value) => ({ value, label: value })),
          ]}
          className="flex-1 min-w-[220px]"
        />
      </div>

      <Card className="mt-2 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/60">
                {headers.map(([key, label]) => (
                  <th key={key} scope="col" className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-full text-left hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      {label}
                      {sort.key === key && (
                        <span className="ml-1">{sort.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                ))}
                <th scope="col" className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  id={`inv-row-${item.id}`}
                  className={`border-t border-slate-200 dark:border-border hover:bg-slate-100/70 dark:hover:bg-muted/30 transition-colors ${item.id === highlightItemId ? "bg-amber-500/20 outline-2 outline-amber-500 outline" : ""}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{item.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-300">{item.name}</td>
                  <td className="px-4 py-3"><Badge color={categoryColors[item.category]} text={item.category} /></td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.unit}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{item.warehouse}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge color={statusColors[item.status]} text={item.status} /></td>
                  <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => onEdit(item)}>Edit</Button></td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No inventory items match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
