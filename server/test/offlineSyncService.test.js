import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import { runMigrations } from "../src/db/migrate.js";
import { SyncError, SyncService } from "../src/sync/service.js";

let pool;
let service;
const worker = { id: "offline-worker", name: "Offline Worker" };
const admin = { id: "offline-admin", name: "Offline Admin" };

function report(id, overrides = {}) {
  return {
    id,
    type: "Flood",
    district: "Dhaka",
    location: { lat: 23.81, lng: 90.41 },
    severity: 4,
    status: "Pending",
    description: "Offline field report.",
    affectedCount: 25,
    time: "2026-08-26T10:00:00.000Z",
    ...overrides,
  };
}

async function submit(id, type, payload, baseSnapshotSeq) {
  return service.submit({ id, type, payload, baseSnapshotSeq }, worker);
}

before(async () => {
  const database = newDb({ autoCreateForeignKeyIndices: true });
  pool = new (database.adapters.createPg().Pool)();
  await runMigrations({ db: pool });
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, email, role, status)
     VALUES ('offline-worker', 'offline.worker', 'unused', 'Offline Worker', 'offline.worker@reliefopt.org', 'field_worker', 'Active'),
            ('offline-admin', 'offline.admin', 'unused', 'Offline Admin', 'offline.admin@reliefopt.org', 'central_admin', 'Active')`,
  );
  service = new SyncService(pool);
});

after(async () => { await pool.end(); });

test("offline create is queued as a proposal and affects the authoritative snapshot only after acceptance", async () => {
  const queued = await submit("offline-create", "ADD_REPORT", report("offline-report"), 0);
  assert.equal(queued.proposal.status, "Pending");
  assert.equal((await service.snapshot()).data.reports.length, 0);

  const accepted = await service.decide("offline-create", { decision: "Accepted" }, admin);
  assert.equal(accepted.proposal.status, "Accepted");
  assert.equal((await service.snapshot()).data.reports.find((item) => item.id === "offline-report").submittedById, worker.id);
});

test("offline update is applied after approval using its queued base snapshot", async () => {
  const base = (await service.snapshot()).snapshotSeq;
  const queued = await submit("offline-update", "UPDATE_REPORT", {
    id: "offline-report", patch: { severity: 5, description: "Updated without a connection." },
  }, base);
  assert.equal(queued.proposal.baseSnapshotSeq, base);
  await service.decide("offline-update", { decision: "Accepted" }, admin);

  const current = (await service.snapshot()).data.reports.find((item) => item.id === "offline-report");
  assert.equal(current.severity, 5);
  assert.equal(current.description, "Updated without a connection.");
});

test("resubmitting the same queued operation is idempotent before and after approval", async () => {
  const base = (await service.snapshot()).snapshotSeq;
  const input = ["offline-duplicate", "ADD_REPORT", report("duplicate-report"), base];
  assert.equal((await submit(...input)).duplicate, false);
  assert.equal((await submit(...input)).duplicate, true);
  await service.decide("offline-duplicate", { decision: "Accepted" }, admin);
  assert.equal((await submit("offline-duplicate", "ADD_REPORT", report("duplicate-report"), (await service.snapshot()).snapshotSeq)).duplicate, true);
  assert.equal((await service.snapshot()).data.reports.filter((item) => item.id === "duplicate-report").length, 1);
});

test("same-record simultaneous updates are processed in arrival order and stale proposals are rejected as conflicts", async () => {
  const base = (await service.snapshot()).snapshotSeq;
  await submit("offline-first", "UPDATE_REPORT", { id: "offline-report", patch: { severity: 3 } }, base);
  await submit("offline-second", "UPDATE_REPORT", { id: "offline-report", patch: { severity: 2 } }, base);

  await assert.rejects(
    () => service.decide("offline-second", { decision: "Accepted" }, admin),
    (error) => error instanceof SyncError && error.code === "PROCESS_EARLIER_FIRST",
  );
  await service.decide("offline-first", { decision: "Accepted" }, admin);
  const conflict = await service.decide("offline-second", { decision: "Accepted" }, admin);
  assert.equal(conflict.proposal.status, "Rejected");
  assert.equal(conflict.proposal.conflictState, "conflict");
  assert.match(conflict.proposal.rejectionReason, /accepted first/);
});

test("unsupported offline delete and deactivate operations are rejected without changing data", async () => {
  const base = (await service.snapshot()).snapshotSeq;
  for (const [id, type, payload] of [
    ["offline-delete", "DELETE_INVENTORY", { id: "water" }],
    ["offline-deactivate", "DEACTIVATE_TEAM", { id: "team" }],
  ]) {
    await assert.rejects(
      () => submit(id, type, payload, base),
      (error) => error instanceof SyncError && error.code === "UNSUPPORTED_PROPOSAL",
    );
  }
  assert.equal((await service.snapshot()).snapshotSeq, base);
});
