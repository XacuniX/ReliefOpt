import { AlertCircle, Hourglass, Package, Satellite, ShieldCheck, Siren } from "lucide-react";
import { useData } from "../../context/DataContext";
import { useOffline } from "../../context/OfflineContext";
import { Card } from "../ui";

export default function KpiCards() {
  const { reports, teams, notifications, inventory } = useData();
  const { isOffline } = useOffline();
  const cards = [
    { label: "Active Incidents", value: reports.filter((report) => report.status !== "Resolved").length, icon: Siren },
    { label: "Deployed Teams", value: teams.filter((team) => team.status === "Deployed").length, icon: ShieldCheck },
    { label: "Critical Alerts", value: notifications.filter((item) => item.type === "Critical" && !item.read).length, icon: AlertCircle },
    { label: "Total Supply Items", value: inventory.reduce((sum, item) => sum + Number(item.qty || 0), 0), icon: Package },
    { label: "Pending Requests", value: reports.filter((report) => report.status === "Pending").length, icon: Hourglass },
    { label: "Offline Nodes", value: teams.filter((team) => team.status === "Offline").length + (isOffline ? 1 : 0), icon: Satellite },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="text-xl font-bold mt-2 mb-1">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
        </Card>
      ))}
    </div>
  );
}
