/**
 * Decorator pattern: adds display-ready information without changing the
 * persisted Report entity or coupling pages to user/team lookup logic.
 */
export function decorateReport(report, { users = [], teams = [] } = {}) {
  const submittedBy =
    users.find((user) => user.id === report.submittedById)?.name ??
    report.submittedBy ??
    "Unknown";
  const assignedTeam =
    teams.find((team) => team.id === report.assignedTeamId)?.name ??
    report.assignedTeam ??
    null;
  const urgencyScore = Number(report.urgencyScore) || 0;

  return {
    ...report,
    submittedBy,
    assignedTeam,
    urgencyScore,
    urgencyLabel: `${urgencyScore}/100`,
    urgencyColor: report.urgencyZone || (urgencyScore >= 70 ? "red" : urgencyScore >= 40 ? "amber" : "green"),
    isActionable: report.status !== "Resolved",
  };
}

export function decorateReports(reports, lookups) {
  return reports.map((report) => decorateReport(report, lookups));
}
