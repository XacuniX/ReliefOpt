import RoleGate from "../components/RoleGate";
import KpiCards from "../components/dashboard/KpiCards";
import TeamTable from "../components/dashboard/TeamTable";
import AlertFeed from "../components/dashboard/AlertFeed";
import ChartPanel from "../components/dashboard/ChartPanel";
import { Button } from "../components/ui";
import { RefreshCw } from "lucide-react";

function DashboardContent() {
  function handleRefresh() {}

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Operations Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Last Updated: just now</p>
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
