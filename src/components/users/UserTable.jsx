import { Pencil, UserX } from "lucide-react";
import { Badge, Button, Card } from "../ui";

const roleColors = { central_admin: "navy", warehouse_manager: "orange", field_worker: "teal" };
const statusColors = { Active: "green", Inactive: "grey", Offline: "amber" };
const initials = (name) => name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase();

export default function UserTable({ users, currentUserId, onEdit, onDeactivate }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-sm">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/60">
              {["Avatar", "Full Name", "Role", "Team/Warehouse", "Status", "Last Login", "Actions"].map((label) => (
                <th key={label} className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-200 dark:border-border hover:bg-slate-100/70 dark:hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {initials(user.name)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-900 dark:text-slate-300">
                  <span className="block font-semibold">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">@{user.username}</span>
                </td>
                <td className="px-4 py-3"><Badge color={roleColors[user.role]} text={user.role.replace(/_/g, " ")} /></td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{user.teamName || user.team || "—"}</td>
                <td className="px-4 py-3"><Badge color={statusColors[user.status]} text={user.status} /></td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
                    : "Never"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(user)} aria-label={`Edit ${user.name}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeactivate(user)}
                    disabled={user.status === "Inactive" || user.id === currentUserId}
                    aria-label={`Deactivate ${user.name}`}
                    title={user.id === currentUserId ? "You cannot deactivate your own account" : undefined}
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No users match the current filters.</p>
        )}
      </div>
    </Card>
  );
}
