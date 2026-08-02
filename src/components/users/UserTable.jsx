import { Badge, Button, Card } from "../ui";

const roleColors = { central_admin: "navy", warehouse_manager: "orange", field_worker: "teal" };
const statusColors = { Active: "green", Inactive: "grey", Offline: "amber" };
const initials = (name) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export default function UserTable({ users, onEdit, onDeactivate }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-sm">
          <thead>
            <tr className="bg-muted/50">
              {["Avatar", "Full Name", "Role", "Team/Warehouse", "Status", "Last Login", "Actions"].map((label) => (
                <th key={label} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {initials(user.name)}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{user.name}</td>
                <td className="px-4 py-3"><Badge color={roleColors[user.role]} text={user.role.replace(/_/g, " ")} /></td>
                <td className="px-4 py-3">{user.team || "—"}</td>
                <td className="px-4 py-3"><Badge color={statusColors[user.status]} text={user.status} /></td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(user.lastLogin).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(user)} aria-label={`Edit ${user.name}`}>✎</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDeactivate(user)} aria-label={`Deactivate ${user.name}`}>⏻</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
