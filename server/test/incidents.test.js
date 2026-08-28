import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import { runMigrations } from "../src/db/migrate.js";
import { SyncError, SyncService } from "../src/sync/service.js";

let pool;
let service;
const actor = { id: "incident-worker", name: "Incident Worker" };

function validIncident(overrides = {}) {
  return {
    id: "incident-1",
    type: "Flood",
    district: "Dhaka",
    location: { lat: 23.8103, lng: 90.4125 },
    severity: 5,
    status: "Pending",
    description: "River water has entered homes near the market.",
    affectedCount: 250,
    peopleCount: 250,
    daysWithoutFood: 3,
    waterLevelFt: 4.5,
    distanceFromAidKm: 15,
    urgencyScore: 82,
    urgencyZone: "red",
    childrenPresent: true,
    elderlyPresent: true,
    time: "2026-08-25T10:00:00.000Z",
    ...overrides,
  };
}

before(async () => {
  const database = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = database.adapters.createPg();
  pool = new adapter.Pool();
  await runMigrations({ db: pool });
  await pool.query("INSERT INTO teams (id, name) VALUES ('incident-team', 'Incident Team')");
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, email, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actor.id, "incident.worker", "not-used-by-service-tests", actor.name, "incident.worker@reliefopt.org", "field_worker", "Active"],
  );
  service = new SyncService(pool);
});

after(async () => {
  await pool.end();
});

test("creates an incident with validated location, severity, people count, and urgency priority", async () => {
  const result = await service.direct("ADD_REPORT", validIncident(), actor);
  assert.equal(result.snapshotSeq, 1);

  const snapshot = await service.snapshot();
  const incident = snapshot.data.reports.find((report) => report.id === "incident-1");
  assert.deepEqual(
    {
      type: incident.type,
      district: incident.district,
      location: incident.location,
      severity: incident.severity,
      affectedCount: incident.affectedCount,
      peopleCount: incident.peopleCount,
      urgencyScore: incident.urgencyScore,
      urgencyZone: incident.urgencyZone,
      status: incident.status,
    },
    {
      type: "Flood",
      district: "Dhaka",
      location: { lat: 23.8103, lng: 90.4125 },
      severity: 5,
      affectedCount: 250,
      peopleCount: 250,
      urgencyScore: 82,
      urgencyZone: "red",
      status: "Pending",
    },
  );
  assert.equal(incident.reference, "DHK-20260825-0001");
});

test("updates incident severity, affected people, team assignment, and description", async () => {
  const result = await service.direct("UPDATE_REPORT", {
    id: "incident-1",
    patch: {
      severity: 3,
      affectedCount: 0,
      assignedTeamId: "incident-team",
      description: "Water is receding and a team is assigned.",
    },
  }, actor);
  assert.equal(result.snapshotSeq, 2);

  const incident = (await service.snapshot()).data.reports.find((report) => report.id === "incident-1");
  assert.equal(incident.severity, 3);
  assert.equal(incident.affectedCount, 0);
  assert.equal(incident.assignedTeamId, "incident-team");
  assert.equal(incident.description, "Water is receding and a team is assigned.");
});

test("acknowledges then resolves an incident through valid status transitions", async () => {
  await service.direct("UPDATE_REPORT", {
    id: "incident-1", patch: { status: "Acknowledged" },
  }, actor);
  await service.direct("UPDATE_REPORT", {
    id: "incident-1", patch: { status: "Resolved" },
  }, actor);

  const incident = (await service.snapshot()).data.reports.find((report) => report.id === "incident-1");
  assert.equal(incident.status, "Resolved");
});

test("rejects invalid incident input, missing required fields, and invalid boundaries", async () => {
  const invalidCases = [
    ["missing incident ID", validIncident({ id: "" }), /Report ID is required/],
    ["missing incident type", validIncident({ id: "invalid-type", type: "" }), /Report type is required/],
    ["severity below range", validIncident({ id: "severity-zero", severity: 0 }), /Severity is invalid/],
    ["severity above range", validIncident({ id: "severity-six", severity: 6 }), /Severity is invalid/],
    ["fractional severity", validIncident({ id: "severity-fraction", severity: 2.5 }), /Severity is invalid/],
    ["negative affected people", validIncident({ id: "negative-people", affectedCount: -1 }), /Affected count is invalid/],
    ["fractional affected people", validIncident({ id: "fractional-people", affectedCount: 1.5 }), /Affected count is invalid/],
    ["latitude outside bounds", validIncident({ id: "bad-lat", location: { lat: 90.1, lng: 0 } }), /Latitude is invalid/],
    ["longitude outside bounds", validIncident({ id: "bad-lng", location: { lat: 0, lng: -180.1 } }), /Longitude is invalid/],
    ["invalid status", validIncident({ id: "bad-status", status: "Closed" }), /Report status is invalid/],
    ["priority score above range", validIncident({ id: "bad-priority", urgencyScore: 101 }), /Urgency score is invalid/],
  ];

  for (const [label, input, message] of invalidCases) {
    await assert.rejects(() => service.direct("ADD_REPORT", input, actor), {
      name: "SyncError", message,
    }, label);
  }
});

test("accepts inclusive location and severity boundaries", async () => {
  await service.direct("ADD_REPORT", validIncident({
    id: "incident-boundaries",
    district: "Boundary",
    location: { lat: -90, lng: 180 },
    severity: 1,
    affectedCount: 0,
    peopleCount: 0,
    urgencyScore: 0,
    urgencyZone: "green",
  }), actor);
  const incident = (await service.snapshot()).data.reports.find((report) => report.id === "incident-boundaries");
  assert.deepEqual(incident.location, { lat: -90, lng: 180 });
  assert.equal(incident.severity, 1);
  assert.equal(incident.affectedCount, 0);
});

test("rejects an update for a missing incident and unsupported incident changes", async () => {
  await assert.rejects(
    () => service.direct("UPDATE_REPORT", { id: "missing-incident", patch: { severity: 2 } }, actor),
    (error) => error instanceof SyncError && error.status === 404 && error.code === "RECORD_NOT_FOUND",
  );
  await assert.rejects(
    () => service.direct("UPDATE_REPORT", { id: "incident-1", patch: { peopleCount: 10 } }, actor),
    (error) => error instanceof SyncError && error.status === 400 && error.code === "VALIDATION_ERROR",
  );
});

test("rejects duplicate incident identifiers without changing the authoritative snapshot", async () => {
  const before = (await service.snapshot()).snapshotSeq;
  await assert.rejects(() => service.direct("ADD_REPORT", validIncident(), actor));
  assert.equal((await service.snapshot()).snapshotSeq, before);
});

test("rejects an invalid direct status transition because reports use workflow states", async () => {
  await service.direct("ADD_REPORT", validIncident({ id: "incident-transition" }), actor);
  await assert.rejects(
    () => service.direct("UPDATE_REPORT", {
      id: "incident-transition", patch: { status: "Resolved" },
    }, actor),
    (error) => error instanceof SyncError && error.code === "INVALID_STATE_TRANSITION",
  );
});
