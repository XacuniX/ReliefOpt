import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import { runMigrations } from "../src/db/migrate.js";
import { SyncError, SyncService } from "../src/sync/service.js";

let pool;
let service;
const actor = { id: "assignment-admin", name: "Assignment Admin" };

function report(id, assignedTeamId = null) {
  return {
    id,
    type: "Flood",
    district: "Dhaka",
    location: { lat: 23.81, lng: 90.41 },
    severity: 3,
    description: "Assignment test incident",
    assignedTeamId,
  };
}

async function assignedTeam(id) {
  return (await service.snapshot()).data.reports.find((entry) => entry.id === id)?.assignedTeamId;
}

before(async () => {
  const database = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = database.adapters.createPg();
  pool = new adapter.Pool();
  await runMigrations({ db: pool });
  await pool.query(`INSERT INTO teams (id, name, member_count, status) VALUES
    ('team-deployed', 'Deployed Response Team', 6, 'Deployed'),
    ('team-standby', 'Standby Response Team', 4, 'Standby'),
    ('team-offline', 'Offline Response Team', 3, 'Offline')`);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, email, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actor.id, "assignment.admin", "not-used-by-service-tests", actor.name, "assignment.admin@reliefopt.org", "central_admin", "Active"],
  );
  service = new SyncService(pool);
});

after(async () => {
  await pool.end();
});

test("assigns an existing deployed team when an incident is created", async () => {
  await service.direct("ADD_REPORT", report("assignment-report-1", "team-deployed"), actor);
  assert.equal(await assignedTeam("assignment-report-1"), "team-deployed");
});

test("reassigns an incident to another existing team without duplicate assignments", async () => {
  await service.direct("UPDATE_REPORT", {
    id: "assignment-report-1", patch: { assignedTeamId: "team-standby" },
  }, actor);
  assert.equal(await assignedTeam("assignment-report-1"), "team-standby");

  await service.direct("UPDATE_REPORT", {
    id: "assignment-report-1", patch: { assignedTeamId: "team-standby" },
  }, actor);
  const incident = (await service.snapshot()).data.reports.filter((entry) => entry.id === "assignment-report-1");
  assert.equal(incident.length, 1);
  assert.equal(incident[0].assignedTeamId, "team-standby");
});

test("assigns different teams to multiple incidents independently", async () => {
  await service.direct("ADD_REPORT", report("assignment-report-2", "team-deployed"), actor);
  await service.direct("ADD_REPORT", report("assignment-report-3", "team-standby"), actor);
  assert.equal(await assignedTeam("assignment-report-2"), "team-deployed");
  assert.equal(await assignedTeam("assignment-report-3"), "team-standby");
});

test("supports unassigning a team from an incident", async () => {
  await service.direct("UPDATE_REPORT", {
    id: "assignment-report-2", patch: { assignedTeamId: null },
  }, actor);
  assert.equal(await assignedTeam("assignment-report-2"), null);
});

test("rejects invalid team IDs with a domain validation error", async () => {
  await assert.rejects(
    () => service.direct("UPDATE_REPORT", {
      id: "assignment-report-1", patch: { assignedTeamId: "not-a-team" },
    }, actor),
    (error) => error instanceof SyncError && error.status === 400 && error.code === "INVALID_TEAM",
  );
  await assert.rejects(
    () => service.direct("ADD_REPORT", report("assignment-report-invalid", "not-a-team"), actor),
    (error) => error instanceof SyncError && error.status === 400 && error.code === "INVALID_TEAM",
  );
});

test("rejects assignment to a missing incident", async () => {
  await assert.rejects(
    () => service.direct("UPDATE_REPORT", {
      id: "missing-incident", patch: { assignedTeamId: "team-deployed" },
    }, actor),
    (error) => error instanceof SyncError && error.status === 404 && error.code === "RECORD_NOT_FOUND",
  );
});

test("team availability is display metadata and does not automatically alter existing assignments", async () => {
  await service.direct("UPDATE_REPORT", {
    id: "assignment-report-3", patch: { assignedTeamId: "team-offline" },
  }, actor);
  await pool.query("UPDATE teams SET status = 'Offline' WHERE id = 'team-standby'");
  assert.equal(await assignedTeam("assignment-report-3"), "team-offline");
  assert.equal((await service.snapshot()).data.teams.find((team) => team.id === "team-standby").status, "Offline");
});

test("does not impose undocumented capability or capacity limits on valid team assignments", async () => {
  await service.direct("ADD_REPORT", report("assignment-report-4", "team-offline"), actor);
  await service.direct("ADD_REPORT", report("assignment-report-5", "team-offline"), actor);

  const snapshot = await service.snapshot();
  const assignedOffline = snapshot.data.reports.filter(
    (entry) => entry.assignedTeamId === "team-offline",
  );
  assert.equal(assignedOffline.length, 3);
  assert.equal(
    snapshot.data.teams.find((team) => team.id === "team-offline").memberCount,
    3,
  );
});
