/** Central admins and warehouse managers act on any task/report; field workers only on their own or their team's. */
const UNRESTRICTED_ROLES = new Set(["central_admin", "warehouse_manager"]);

export function canActOnTask(task, user) {
  if (!user) return false;
  if (UNRESTRICTED_ROLES.has(user.role)) return true;
  const individualMatch = task.assignedUserId
    ? task.assignedUserId === user.id
    : Boolean(task.assignedTo) && task.assignedTo === user.name;
  const teamMatch = Boolean(task.assignedTeamId) && task.assignedTeamId === user.teamId;
  return individualMatch || teamMatch;
}

export function canActOnReport(report, user) {
  if (!user) return false;
  if (UNRESTRICTED_ROLES.has(user.role)) return true;
  const submitterMatch = Boolean(report.submittedById) && report.submittedById === user.id;
  const teamMatch = Boolean(report.assignedTeamId) && report.assignedTeamId === user.teamId;
  return submitterMatch || teamMatch;
}
