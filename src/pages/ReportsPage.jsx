import { useState, useMemo } from "react";
import { Input, Select, Table, Badge } from "../components/ui";
import ReportDrawer from "../components/reports/ReportDrawer";
import { reports as mockReports } from "../mockData";

const typeColors = {
  Flood: "blue",
  Cyclone: "red",
  Earthquake: "amber",
  Fire: "orange",
  Other: "grey",
};

const statusColors = {
  Pending: "amber",
  Acknowledged: "blue",
  Resolved: "green",
};

export default function ReportsPage() {
  const [reports, setReports] = useState(mockReports);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const filtered = useMemo(() => {
    let result = [...reports];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.submittedBy.toLowerCase().includes(q)
      );
    }
    if (typeFilter) result = result.filter((r) => r.type === typeFilter);
    if (severityFilter) result = result.filter((r) => r.severity === Number(severityFilter));
    if (statusFilter) result = result.filter((r) => r.status === statusFilter);
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((r) => new Date(r.time) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.time) <= to);
    }

    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [reports, search, typeFilter, severityFilter, statusFilter, dateFrom, dateTo, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleStatusChange(reportId, newStatus) {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );
  }

  const columns = [
    {
      key: "id",
      label: "Report ID",
      render: (row) => (
        <span className="font-mono text-xs font-semibold">{row.id}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => <Badge color={typeColors[row.type] || "grey"} text={row.type} />,
    },
    { key: "location", label: "Location" },
    {
      key: "severity",
      label: "Severity",
      render: (row) => (
        <Badge
          color={row.severity <= 2 ? "green" : row.severity <= 3 ? "amber" : "red"}
          text={String(row.severity)}
        />
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge color={statusColors[row.status] || "grey"} text={row.status} />
      ),
    },
    { key: "submittedBy", label: "Submitted By" },
    {
      key: "time",
      label: "Time",
      render: (row) =>
        new Date(row.time).toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Emergency Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {filtered.length} report{filtered.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search ID, location, submitter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px]"
        />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: "", label: "All Types" },
            ...["Flood", "Cyclone", "Earthquake", "Fire", "Other"].map((t) => ({
              value: t,
              label: t,
            })),
          ]}
        />
        <Select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          options={[
            { value: "", label: "All Severities" },
            ...[1, 2, 3, 4, 5].map((s) => ({ value: String(s), label: `Severity ${s}` })),
          ]}
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All Statuses" },
            ...["Pending", "Acknowledged", "Resolved"].map((s) => ({
              value: s,
              label: s,
            })),
          ]}
        />
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-auto"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-auto"
        />
      </div>

      <Table
        columns={columns}
        data={filtered}
        onSort={handleSort}
        sortKey={sortKey}
        sortDir={sortDir}
        onRowClick={setSelectedReport}
      />

      <ReportDrawer
        report={selectedReport}
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
