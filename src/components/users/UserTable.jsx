import { Badge, Button, Card } from "../ui";

const roleColors = { central_admin: "navy", warehouse_manager: "orange", field_worker: "teal" };
const statusColors = { Active: "green", Inactive: "grey", Offline: "amber" };
const initials = (name) => name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();

export default function UserTable({ users, onEdit, onDeactivate }) {
  return (
    <Card style={{ overflow: "hidden", padding: 0 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 940, width: "100%" }}>
          <thead><tr style={{ background: "#F8FAFC" }}>{["Avatar", "Full Name", "Role", "Assigned Team/Warehouse", "Status", "Last Login", "Actions"].map((label) => <th key={label} style={{ color: "#64748b", fontSize: 12, letterSpacing: ".04em", padding: "12px 16px", textAlign: "left", textTransform: "uppercase" }}>{label}</th>)}</tr></thead>
          <tbody>{users.map((user) => <tr key={user.id}>
            <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px" }}><span aria-label={`${user.name} avatar`} style={{ alignItems: "center", background: "var(--color-teal)", borderRadius: "50%", color: "white", display: "inline-flex", fontSize: 12, fontWeight: 700, height: 32, justifyContent: "center", width: 32 }}>{initials(user.name)}</span></td>
            <td style={{ borderTop: "1px solid #E2E8F0", fontWeight: 600, padding: "12px 16px" }}>{user.name}</td>
            <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px" }}><Badge color={roleColors[user.role]} text={user.role.replaceAll("_", " ")} /></td>
            <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px" }}>{user.team || "—"}</td>
            <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px" }}><Badge color={statusColors[user.status]} text={user.status} /></td>
            <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px", whiteSpace: "nowrap" }}>{new Date(user.lastLogin).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
            <td style={{ borderTop: "1px solid #E2E8F0", padding: "12px 16px", whiteSpace: "nowrap" }}><Button size="sm" variant="ghost" onClick={() => onEdit(user)} aria-label={`Edit ${user.name}`}>✎</Button> <Button size="sm" variant="ghost" onClick={() => onDeactivate(user)} aria-label={`Deactivate ${user.name}`}>⏻</Button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}
