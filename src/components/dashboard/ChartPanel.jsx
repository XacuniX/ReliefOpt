import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { Card } from "../ui";
import { inventory, reports } from "../../mockData";
import { useTheme } from "../../context/ThemeContext";

const lightColors = ["#0d9488", "#f59e0b", "#0369a1", "#e53e3e", "#6b7280"];
const darkColors = ["#2dd4bf", "#f59e0b", "#38bdf8", "#f75555", "#8895a9"];

export default function ChartPanel() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const chartColors = isDark ? darkColors : lightColors;

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
    <section aria-label="Charts">
      <h2 className="text-lg font-bold mb-3">Analytics Overview</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-2">Supply Distribution by Warehouse</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1f2a3d" : "#e0e4ea"} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: isDark ? "#8895a9" : "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? "#8895a9" : "#6b7280" }} />
              <Tooltip />
              <Bar dataKey="supplies" fill={isDark ? "#2dd4bf" : "#0d9488"} radius={[4, 4, 0, 0]} name="Supply Qty" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-foreground mb-2">Incidents by Type</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={chartColors[idx % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </section>
  );
}
