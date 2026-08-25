import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "../../context/DataContext";
import { useTheme } from "../../context/ThemeContext";
import { Card } from "../ui";

const colors = ["#0d9488", "#f59e0b", "#0369a1", "#e53e3e", "#6b7280"];

export default function ChartPanel() {
  const { inventory, reports, warehouses } = useData();
  const { resolvedTheme } = useTheme();
  const barData = useMemo(() => warehouses.map((warehouse) => ({
    name: warehouse.name,
    supplies: inventory.filter((item) => item.warehouseId === warehouse.id).reduce((sum, item) => sum + Number(item.qty || 0), 0),
  })), [inventory, warehouses]);
  const pieData = useMemo(() => Object.entries(reports.reduce((counts, report) => ({
    ...counts, [report.type]: (counts[report.type] || 0) + 1,
  }), {})).map(([name, value]) => ({ name, value })), [reports]);
  const grid = resolvedTheme === "dark" ? "#1f2a3d" : "#e0e4ea";

  return <section aria-label="Charts"><h2 className="text-lg font-bold mb-3">Analytics Overview</h2>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card><h3 className="text-sm font-semibold mb-2">Supply Distribution by Warehouse</h3><ResponsiveContainer width="100%" height={240}><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" stroke={grid} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="supplies" fill="#0d9488" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></Card>
      <Card><h3 className="text-sm font-semibold mb-2">Incidents by Type</h3><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={pieData} outerRadius={80} dataKey="value" nameKey="name">{pieData.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></Card>
    </div>
  </section>;
}
