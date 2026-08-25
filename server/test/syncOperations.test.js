import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import { runMigrations } from "../src/db/migrate.js";
import { SyncError, SyncService } from "../src/sync/service.js";

let pool;
let service;
const actor = { id: "sync-operations-user", name: "Sync Operations User" };

before(async () => {
  const database = newDb({ autoCreateForeignKeyIndices: true });
  pool = new (database.adapters.createPg().Pool)();
  await runMigrations({ db: pool });
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, role, status)
     VALUES ($1, 'sync.operations', 'unused', $2, 'central_admin', 'Active')`,
    [actor.id, actor.name],
  );
  await pool.query(
    `INSERT INTO notifications (id, user_id, type, title, body)
     VALUES ('notification-owned', $1, 'Info', 'Owned', 'Visible to this user'),
            ('notification-other', NULL, 'System', 'Shared', 'Visible to all users')`,
    [actor.id],
  );
  service = new SyncService(pool);
});

after(async () => { await pool.end(); });

test("direct task mutations preserve task data, update supported fields, and advance the snapshot", async () => {
  const created = await service.direct("ADD_TASK", {
    id: "task-sync-1", title: "Deliver water", description: "Deliver to the north shelter.",
    priority: "Critical", status: "To Do", resources: { water: 40 }, updates: [],
  }, actor);
  assert.equal(created.snapshotSeq, 1);
  const updated = await service.direct("UPDATE_TASK", {
    id: "task-sync-1", patch: { status: "In Progress", priority: "High", updates: [{ text: "Vehicle departed" }] },
  }, actor);
  assert.equal(updated.snapshotSeq, 2);
  const task = (await service.snapshot()).data.tasks.find((entry) => entry.id === "task-sync-1");
  assert.deepEqual({ title: task.title, status: task.status, priority: task.priority, resources: task.resources }, {
    title: "Deliver water", status: "In Progress", priority: "High", resources: { water: 40 },
  });
  assert.deepEqual(task.updates, [{ text: "Vehicle departed" }]);
});

test("task mutations reject unsupported changes, invalid status values, and missing targets", async () => {
  for (const payload of [
    { id: "task-sync-1", patch: { unknown: true } },
    { id: "task-sync-1", patch: { status: "Paused" } },
    { id: "missing-task", patch: { title: "Missing" } },
  ]) {
    await assert.rejects(
      () => service.direct("UPDATE_TASK", payload, actor),
      (error) => error instanceof SyncError && ["VALIDATION_ERROR", "RECORD_NOT_FOUND"].includes(error.code),
    );
  }
});

test("map pins and notification read mutations update only valid authoritative records", async () => {
  await service.direct("ADD_MAP_PIN", {
    id: "pin-sync-1", lat: 23.81, lng: 90.41, locationName: "Dhaka", peopleCount: 20, childrenPresent: true,
  }, actor);
  await service.direct("MARK_NOTIFICATION_READ", { id: "notification-owned" }, actor);
  await service.direct("MARK_ALL_NOTIFICATIONS_READ", {}, actor);
  const snapshot = await service.snapshot();
  const pin = snapshot.data.mapPins.find((entry) => entry.id === "pin-sync-1");
  assert.deepEqual(
    {
      id: pin.id, reportId: pin.reportId, location: pin.location, lat: pin.lat, lng: pin.lng,
      waterLevelFt: pin.waterLevelFt, peopleCount: pin.peopleCount, childrenPresent: pin.childrenPresent,
    },
    {
      id: "pin-sync-1", reportId: null, location: "Dhaka", lat: 23.81, lng: 90.41,
      waterLevelFt: null, peopleCount: 20, childrenPresent: true,
    },
  );
  assert.ok(pin.createdAt);
  assert.equal(snapshot.data.notifications.every((entry) => entry.read), true);
  await assert.rejects(
    () => service.direct("MARK_NOTIFICATION_READ", { id: "missing-notification" }, actor),
    (error) => error instanceof SyncError && error.code === "RECORD_NOT_FOUND",
  );
});

test("proposal submissions reject invalid base sequences and malformed payloads before persistence", async () => {
  const before = (await service.snapshot()).snapshotSeq;
  for (const input of [
    { id: "bad-base-negative", type: "ADD_TASK", payload: { id: "x", title: "Task" }, baseSnapshotSeq: -1 },
    { id: "bad-base-future", type: "ADD_TASK", payload: { id: "y", title: "Task" }, baseSnapshotSeq: before + 1 },
    { id: "bad-payload", type: "ADD_TASK", payload: [], baseSnapshotSeq: before },
  ]) {
    await assert.rejects(
      () => service.submit(input, actor),
      (error) => error instanceof SyncError && ["INVALID_BASE_SNAPSHOT", "VALIDATION_ERROR"].includes(error.code),
    );
  }
  assert.equal((await service.snapshot()).snapshotSeq, before);
});
