import { useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { decideProposal, fetchProposals } from "../../lib/syncApi";
import { Badge, Button, Card, Input, Loader, Toast } from "../ui";

const statusColor = { Pending: "amber", Accepted: "green", Rejected: "red" };

const TYPE_LABELS = {
  ADD_REPORT: "New incident report",
  UPDATE_REPORT: "Report update",
  ADD_REPORT_NOTE: "Report note",
  ADD_TASK: "New task",
  UPDATE_TASK: "Task update",
  ADD_INVENTORY: "New inventory item",
  UPDATE_INVENTORY: "Inventory update",
  UPDATE_ITEM_QTY: "Stock adjustment",
  ADD_STOCK_LOG: "Stock log entry",
  ADD_MAP_PIN: "New map pin",
  MARK_NOTIFICATION_READ: "Notification read",
  MARK_ALL_NOTIFICATIONS_READ: "All notifications read",
};

function proposalTitle(type) {
  return TYPE_LABELS[type] || type.replace(/_/g, " ");
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function formatQty(qty, unit) {
  if (qty === undefined || qty === null) return undefined;
  return unit ? `${qty} ${unit}` : String(qty);
}

function formatChange(value) {
  if (value === undefined || value === null) return undefined;
  return value > 0 ? `+${value}` : String(value);
}

/** Builds labeled, human-readable detail rows for a proposal instead of dumping its raw JSON payload. */
function describeProposal(proposal, { teams, users, reports, tasks }) {
  const payload = proposal.payload || {};
  const patch = payload.patch || {};
  const teamName = (id) => teams.find((team) => team.id === id)?.name;
  const userName = (id) => users.find((user) => user.id === id)?.name;

  const rows = [];
  const add = (label, value) => {
    if (value === undefined || value === null || value === "") return;
    rows.push({ label, value: String(value) });
  };

  switch (proposal.type) {
    case "ADD_REPORT":
      add("Type", payload.type);
      add("District", payload.district);
      add("Severity", payload.severity);
      add("Affected people", payload.affectedCount);
      add("Description", payload.description);
      break;
    case "UPDATE_REPORT": {
      const report = reports.find((item) => item.id === payload.id);
      add("Report", report ? report.reference || report.type : payload.id);
      add("Status", patch.status);
      if (Object.hasOwn(patch, "assignedTeamId")) add("Assigned team", teamName(patch.assignedTeamId) || "Unassigned");
      add("Severity", patch.severity);
      add("Description", patch.description);
      break;
    }
    case "ADD_REPORT_NOTE": {
      const report = reports.find((item) => item.id === payload.id);
      add("Report", report ? report.reference || report.type : payload.id);
      add("Note", payload.note?.text);
      break;
    }
    case "ADD_TASK":
      add("Title", payload.title);
      add("Priority", payload.priority);
      add("Assigned team", teamName(payload.assignedTeamId));
      add("Assigned to", userName(payload.assignedUserId));
      add("Due", formatDate(payload.dueTime));
      break;
    case "UPDATE_TASK": {
      const task = tasks.find((item) => item.id === payload.id);
      add("Task", task ? task.title : payload.id);
      add("Status", patch.status);
      add("Priority", patch.priority);
      if (Object.hasOwn(patch, "assignedTeamId")) add("Assigned team", teamName(patch.assignedTeamId) || "Unassigned");
      if (Object.hasOwn(patch, "assignedUserId")) add("Assigned to", userName(patch.assignedUserId) || "Unassigned");
      break;
    }
    case "ADD_INVENTORY":
      add("Item", payload.name);
      add("Category", payload.category);
      add("Quantity", formatQty(payload.qty, payload.unit));
      add("Warehouse", payload.warehouse);
      break;
    case "UPDATE_INVENTORY":
      add("Quantity", formatQty(patch.qty, patch.unit));
      add("Status", patch.status);
      break;
    case "UPDATE_ITEM_QTY":
      add("Change", formatChange(payload.delta));
      add("Reason", payload.reason);
      break;
    case "ADD_STOCK_LOG":
      add("Item", payload.itemName);
      add("Change", formatChange(payload.change));
      add("Reason", payload.reason);
      break;
    case "ADD_MAP_PIN":
      add("Location", payload.location || payload.title);
      break;
    default:
      break;
  }
  return rows;
}

export default function ApprovalQueue() {
  const { accessToken } = useAuth();
  const { refreshSnapshot, teams, users, reports, tasks } = useData();
  const [proposals, setProposals] = useState([]);
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetchProposals(accessToken);
      setProposals(response.proposals);
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function decide(proposal, decision) {
    const reason = reasons[proposal.id]?.trim() || "";
    if (decision === "Rejected" && !reason) {
      setToast({ type: "warning", message: "Enter a rejection reason first." });
      return;
    }
    setBusyId(proposal.id);
    try {
      const result = await decideProposal(
        accessToken,
        proposal.id,
        decision,
        reason,
      );
      setProposals((items) =>
        items.map((item) => (item.id === proposal.id ? result.proposal : item)),
      );
      await refreshSnapshot();
      setToast({
        type:
          result.proposal.conflictState === "conflict" ? "warning" : "success",
        message:
          result.proposal.status === "Rejected"
            ? result.proposal.rejectionReason
            : "Proposal accepted into the authoritative snapshot.",
      });
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setBusyId("");
    }
  }

  if (loading) return <Loader />;
  const pending = proposals.filter((proposal) => proposal.status === "Pending");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {pending.length} awaiting review
        </p>
        <Button size="sm" variant="ghost" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      {!pending.length && (
        <p className="text-sm text-muted-foreground">
          No proposals are awaiting approval.
        </p>
      )}
      {pending.map((proposal) => {
        const rows = describeProposal(proposal, { teams, users, reports, tasks });
        return (
          <Card key={proposal.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm">{proposalTitle(proposal.type)}</strong>
              <Badge
                color={statusColor[proposal.status]}
                text={proposal.status}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {proposal.userName || proposal.userId} · {formatDate(proposal.createdAt)} · base #{proposal.baseSnapshotSeq}
            </p>
            {rows.length > 0 ? (
              <div className="rounded bg-background p-2 space-y-1 text-sm">
                {rows.map(({ label, value }) => (
                  <div key={label} className="flex items-baseline justify-between gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-right break-words">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No additional details.</p>
            )}
            <Input
              id={`rejection-reason-${proposal.id}`}
              label="Rejection reason"
              value={reasons[proposal.id] || ""}
              onChange={(event) =>
                setReasons((current) => ({
                  ...current,
                  [proposal.id]: event.target.value,
                }))
              }
              placeholder="Required only when rejecting"
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="destructive"
                loading={busyId === proposal.id}
                onClick={() => decide(proposal, "Rejected")}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
              <Button
                size="sm"
                loading={busyId === proposal.id}
                onClick={() => decide(proposal, "Accepted")}
              >
                <Check className="h-4 w-4" /> Approve
              </Button>
            </div>
          </Card>
        );
      })}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
