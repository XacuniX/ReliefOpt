import { useState } from "react";
import RoleGate from "../components/RoleGate";
import KpiCards from "../components/dashboard/KpiCards";
import TeamTable from "../components/dashboard/TeamTable";
import AlertFeed from "../components/dashboard/AlertFeed";
import ChartPanel from "../components/dashboard/ChartPanel";
import { Button } from "../components/ui";
import { RefreshCw } from "lucide-react";
import { useData } from "../context/DataContext";

function DashboardContent() {
  const { ready } = useData();
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [refreshKey, setRefreshKey] = useState(0);

  function handleRefresh() {
    setLastUpdated(Date.now());
    setRefreshKey((k) => k + 1);
  }

  function timeAgo(ts) {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 5) return "just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    return `${min} min ago`;
  }

  if (!ready) return <p className="text-muted-foreground">Loading dashboard…</p>;

  return (
    <div className="max-w-7xl mx-auto" key={refreshKey}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Last Updated: {timeAgo(lastUpdated)}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRefresh} aria-label="Refresh dashboard">
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      <KpiCards />

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 mt-6">
        <TeamTable />
        <AlertFeed />
      </div>

      <div className="mt-6">
        <ChartPanel />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RoleGate allowed={["central_admin", "warehouse_manager"]}>
      <DashboardContent />
    </RoleGate>
  );
}
