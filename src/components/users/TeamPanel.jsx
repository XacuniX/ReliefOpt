import { useState } from "react";
import { Badge, Card } from "../ui";
import { teams, users } from "../../mockData";

const teamColors = { Deployed: "green", Standby: "amber", Offline: "grey" };
const roleColors = { central_admin: "navy", warehouse_manager: "orange", field_worker: "teal" };
const dotColors = { Active: "#1E8449", Inactive: "#C0392B", Offline: "#D4880F" };

export default function TeamPanel({ teamList = teams, userList = users }) {
  const [expandedId, setExpandedId] = useState("");
  return (
    <section style={{ marginTop: 28 }} aria-labelledby="teams-heading">
      <h2 id="teams-heading" style={{ fontSize: 20 }}>Teams</h2>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {teamList.map((team) => {
          const expanded = expandedId === team.id;
          const members = userList.filter((user) => user.team === team.name);
          return <Card key={team.id} style={{ cursor: "pointer" }} onClick={() => setExpandedId(expanded ? "" : team.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setExpandedId(expanded ? "" : team.id)}>
            <div style={{ alignItems: "start", display: "flex", gap: 8, justifyContent: "space-between" }}><h3 style={{ fontSize: 17, margin: 0 }}>{team.name}</h3><Badge color={teamColors[team.status]} text={team.status} /></div>
            <p style={{ margin: "12px 0 4px" }}><strong>Leader:</strong> {team.leader}</p><p style={{ margin: "4px 0" }}><strong>Members:</strong> {team.memberCount}</p><p style={{ margin: "4px 0" }}><strong>Location:</strong> {team.location}</p><p style={{ color: "#64748b", marginBottom: 0 }}>{team.activeTask}</p>
            {expanded && <div style={{ borderTop: "1px solid var(--color-mid)", marginTop: 14, paddingTop: 12 }}><strong>Team members</strong>{members.map((member) => <div key={member.id} style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between", marginTop: 10 }}><span><span title={member.status} style={{ background: dotColors[member.status], borderRadius: "50%", display: "inline-block", height: 8, marginRight: 7, width: 8 }} />{member.name}</span><Badge color={roleColors[member.role]} text={member.role.replaceAll("_", " ")} /></div>)}{!members.length && <p style={{ color: "#64748b", marginBottom: 0 }}>No members listed.</p>}</div>}
          </Card>;
        })}
      </div>
    </section>
  );
}
