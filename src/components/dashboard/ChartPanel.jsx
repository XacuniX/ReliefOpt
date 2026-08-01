import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { Card } from "../ui";
import { inventory, reports } from "../../mockData";

const barColors = {
  warehouse: "var(--color-teal)",
};

const pieColors = ["#1B2A4A", "#16A085", "#F39C12", "#C0392B", "#BDC3C7"];

const chartWrapper = {
  background: "var(--color-white)",
  borderRadius: 8,
  padding: "var(--space-4) var(--space-4) var(--space-2)",
};

export default function ChartPanel() {
  const barData = useMemo(() => {
    const warehouses = ["Warehouse A", "Warehouse B", "Warehouse C", "Warehouse D", "Warehouse E"];
    return warehouses.map((wh) => {
      const total = inventory
        .filter((i) => i.warehouse === wh)
        .reduce((sum, i) => sum + i.qty, 0);
      return { name: wh, supplies: total };
    });
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
      <h2 style={{ fontSize: "var(--text-lg)", margin: "0 0 var(--space-3)" }}>Analytics Overview</h2>
      <div className="chart-panel-grid">
        <div style={chartWrapper}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 var(--space-2)", color: "var(--color-navy)" }}>
            Supply Distribution by Warehouse
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="supplies" fill={barColors.warehouse} radius={[4, 4, 0, 0]} name="Supply Qty" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={chartWrapper}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 var(--space-2)", color: "var(--color-navy)" }}>
            Incidents by Type
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name">
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
