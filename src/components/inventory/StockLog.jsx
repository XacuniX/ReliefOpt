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
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-3">Stock change log</h2>
      <div className="flex flex-wrap gap-4">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 min-w-[220px]" />
        <Input label="Search item" placeholder="Search by item name" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[220px]" />
      </div>
      <Card className="mt-4 p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[150px_minmax(180px,1fr)_80px_120px_minmax(130px,0.7fr)] gap-4 px-4 py-3 bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span>Timestamp</span>
              <span>Item</span>
              <span>Change</span>
              <span>Reason</span>
              <span>Changed by</span>
            </div>
            {filteredLogs.map((log) => {
              const positive = log.change > 0;
              return (
                <div key={log.id} className="grid grid-cols-[150px_minmax(180px,1fr)_80px_120px_minmax(130px,0.7fr)] gap-4 px-4 py-3 border-t border-border text-sm items-center hover:bg-muted/30 transition-colors">
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <strong>{log.itemName}</strong>
                  <span className={`font-bold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {positive ? "+" : ""}{log.change}
                  </span>
                  <span><Badge color={reasonColors[log.reason]} text={log.reason} /></span>
                  <span>{log.user}</span>
                </div>
              );
            })}
            {!filteredLogs.length && (
              <p className="text-muted-foreground text-center py-5">No stock changes match the selected filters.</p>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}
