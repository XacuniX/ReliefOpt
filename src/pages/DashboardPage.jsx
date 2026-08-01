import RoleGate from "../components/RoleGate";
import KpiCards from "../components/dashboard/KpiCards";
import TeamTable from "../components/dashboard/TeamTable";
import AlertFeed from "../components/dashboard/AlertFeed";
import ChartPanel from "../components/dashboard/ChartPanel";

const pageStyle = {
  maxWidth: 1280,
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--space-6)",
};

const titleStyle = {
  fontSize: "var(--text-2xl)",
  margin: 0,
};

const subtitleStyle = {
  color: "var(--color-mid)",
  margin: "4px 0 0",
  fontSize: "var(--text-sm)",
};

const refreshBtn = {
  background: "transparent",
  border: "1.5px solid var(--color-mid)",
  borderRadius: "50%",
  width: 40,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: 18,
  color: "var(--color-mid)",
  transition: "all 0.2s",
};

function DashboardContent() {
  function handleRefresh() {
    // future: refetch data
  }

  return (
    <main style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Operations Dashboard</h1>
          <p style={subtitleStyle}>Last Updated: just now</p>
        </div>
        <button
          type="button"
          style={refreshBtn}
          onClick={handleRefresh}
          aria-label="Refresh dashboard"
          onMouseEnter={(e) => {
            e.target.style.borderColor = "var(--color-teal)";
            e.target.style.color = "var(--color-teal)";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "var(--color-mid)";
            e.target.style.color = "var(--color-mid)";
          }}
        >
          ⟳
        </button>
      </div>

      <KpiCards />

      <div className="dashboard-grid">
        <TeamTable />
        <AlertFeed />
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <ChartPanel />
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RoleGate allowed={["central_admin", "warehouse_manager"]}>
      <DashboardContent />
    </RoleGate>
  );
}
