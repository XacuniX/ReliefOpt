import { useMemo, useState } from "react";
import { Badge, Card, Input } from "../ui";

const stockLogs = [
  { id: "log1", timestamp: "2026-07-26T11:10:00Z", itemName: "Drinking Water (Bottled)", change: 500, reason: "Restocking", user: "Fatima Begum" },
  { id: "log2", timestamp: "2026-07-26T10:35:00Z", itemName: "Plastic Sheeting Rolls", change: -3, reason: "Distribution", user: "Kamal Hossain" },
  { id: "log3", timestamp: "2026-07-26T10:05:00Z", itemName: "Flashlights & Batteries", change: -2, reason: "Damage", user: "Mizanur Rahman" },
  { id: "log4", timestamp: "2026-07-26T09:45:00Z", itemName: "Paracetamol Tablets", change: 20, reason: "Restocking", user: "Fatima Begum" },
  { id: "log5", timestamp: "2026-07-26T08:50:00Z", itemName: "Cooking Oil", change: -4, reason: "Distribution", user: "Nasrin Akter" },
  { id: "log6", timestamp: "2026-07-26T08:05:00Z", itemName: "Rice (Fortified)", change: -120, reason: "Distribution", user: "Kamal Hossain" },
  { id: "log7", timestamp: "2026-07-25T16:20:00Z", itemName: "Emergency Tarpaulins", change: 8, reason: "Adjustment", user: "Fatima Begum" },
  { id: "log8", timestamp: "2026-07-25T14:35:00Z", itemName: "Oral Rehydration Salts", change: 100, reason: "Restocking", user: "Mizanur Rahman" },
  { id: "log9", timestamp: "2026-07-25T11:15:00Z", itemName: "First Aid Kits", change: -6, reason: "Distribution", user: "Taslima Khatun" },
  { id: "log10", timestamp: "2026-07-24T17:05:00Z", itemName: "Portable Water Pumps", change: -1, reason: "Damage", user: "Mizanur Rahman" },
];

const reasonColors = { Distribution: "teal", Restocking: "green", Damage: "red", Adjustment: "amber" };

const styles = {
  section: { marginTop: 28 },
  filters: { display: "flex", flexWrap: "wrap", gap: 16, marginTop: 12 },
  filter: { flex: "1 1 220px", marginBottom: 0 },
  card: { marginTop: 16, padding: 0, overflow: "hidden" },
  row: { alignItems: "center", borderTop: "1px solid #e2e8f0", display: "grid", gap: 16, gridTemplateColumns: "150px minmax(180px, 1fr) 80px 120px minmax(130px, 0.7fr)", padding: "14px 16px" },
  header: { background: "#f8fafc", borderTop: "none", color: "#64748b", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" },
};

export default function StockLog() {
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return stockLogs.filter((log) => {
      const matchesDate = !date || log.timestamp.slice(0, 10) === date;
      return matchesDate && (!query || log.itemName.toLowerCase().includes(query));
    });
  }, [date, search]);

  return (
    <section style={styles.section} aria-labelledby="stock-log-heading">
      <h2 id="stock-log-heading" style={{ fontSize: 20, margin: 0 }}>Stock change log</h2>
      <div style={styles.filters}>
        <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} style={styles.filter} />
        <Input label="Search item" placeholder="Search by item name" value={search} onChange={(event) => setSearch(event.target.value)} style={styles.filter} />
      </div>
      <Card style={styles.card}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 760 }}>
            <div style={{ ...styles.row, ...styles.header }}>
              <span>Timestamp</span><span>Item</span><span>Change</span><span>Reason</span><span>Changed by</span>
            </div>
            {filteredLogs.map((log) => {
              const positive = log.change > 0;
              return (
                <div key={log.id} style={styles.row}>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <strong>{log.itemName}</strong>
                  <span style={{ color: positive ? "#1E8449" : "#C0392B", fontWeight: 700 }}>{positive ? "+" : ""}{log.change}</span>
                  <span><Badge color={reasonColors[log.reason]} text={log.reason} /></span>
                  <span>{log.user}</span>
                </div>
              );
            })}
            {!filteredLogs.length && <p style={{ color: "#64748b", margin: 0, padding: 20, textAlign: "center" }}>No stock changes match the selected filters.</p>}
          </div>
        </div>
      </Card>
    </section>
  );
}
