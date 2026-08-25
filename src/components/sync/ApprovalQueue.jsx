import { useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { decideProposal, fetchProposals } from "../../lib/syncApi";
import { Badge, Button, Input, Loader, Toast } from "../ui";

const statusColor = { Pending: "amber", Accepted: "green", Rejected: "red" };

export default function ApprovalQueue() {
  const { accessToken } = useAuth();
  const { refreshSnapshot } = useData();
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
      {pending.map((proposal) => (
        <article
          key={proposal.id}
          className="rounded-lg border bg-muted/30 p-3 space-y-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm">
              {proposal.type.replace(/_/g, " ")}
            </strong>
            <Badge
              color={statusColor[proposal.status]}
              text={proposal.status}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {proposal.userName || proposal.userId} Ã‚Â·{" "}
            {new Date(proposal.createdAt).toLocaleString()} Ã‚Â· base #
            {proposal.baseSnapshotSeq}
          </p>
          <pre className="max-h-28 overflow-auto rounded bg-background p-2 text-[11px] whitespace-pre-wrap break-all">
            {JSON.stringify(proposal.payload, null, 2)}
          </pre>
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
        </article>
      ))}
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
