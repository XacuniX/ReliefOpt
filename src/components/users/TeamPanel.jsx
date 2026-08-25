import { useState } from "react";
import { Badge, Card } from "../ui";
import { useData } from "../../context/DataContext";

const teamColors = { Deployed: "green", Standby: "amber", Offline: "grey" };
const roleColors = { central_admin: "navy", warehouse_manager: "orange", field_worker: "teal" };
const dotColors = { Active: "bg-emerald-600", Inactive: "bg-red-600", Offline: "bg-amber-500" };

export default function TeamPanel({ teamList, userList }) {
  const data = useData();
  const teams = teamList || data.teams;
  const users = userList || data.users;
  const [expandedId, setExpandedId] = useState("");

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4">Teams</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.map((team) => {
          const expanded = expandedId === team.id;
          const members = users.filter(
            (user) => user.teamId === team.id || user.team === team.name
          );
          const leader = users.find((user) => user.id === team.leaderId)?.name || team.leader;
          return (
            <Card
              key={team.id}
              className="cursor-pointer"
              onClick={() => setExpandedId(expanded ? "" : team.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setExpandedId(expanded ? "" : team.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold">{team.name}</h3>
                <Badge color={teamColors[team.status]} text={team.status} />
              </div>
              <p className="mt-3 mb-1"><strong>Leader:</strong> {leader || "Unassigned"}</p>
              <p className="my-1"><strong>Members:</strong> {members.length}</p>
              <p className="my-1"><strong>Location:</strong> {team.location}</p>
              <p className="text-muted-foreground text-sm">{team.activeTask}</p>
              {expanded && (
                <div className="border-t mt-3 pt-3">
                  <strong className="text-sm">Team members</strong>
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-2 mt-2.5">
                      <span>
                        <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${dotColors[member.status]}`} />
                        {member.name}
                      </span>
                      <Badge color={roleColors[member.role]} text={member.role.replace(/_/g, " ")} />
                    </div>
                  ))}
                  {!members.length && <p className="text-muted-foreground text-sm">No members listed.</p>}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
