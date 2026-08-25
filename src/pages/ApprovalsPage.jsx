import ApprovalQueue from "../components/sync/ApprovalQueue";

export default function ApprovalsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review pending changes before they are applied to the authoritative relief snapshot.
        </p>
      </div>
      <ApprovalQueue />
    </div>
  );
}
