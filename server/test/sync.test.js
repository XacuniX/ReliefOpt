import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { newDb } from "pg-mem";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/db/migrate.js";
import { TEST_CONFIG } from "../test-support/helpers.js";

const PASSWORD = "synchronization test password";
let pool;
let server;
let origin;
let adminToken;
let workerToken;

function request(path, { token, body, ...options } = {}) {
  return fetch(`${origin}${path}`, {
    ...options,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function login(username) {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { username, password: PASSWORD },
  });
  return (await response.json()).accessToken;
}

async function submit(token, id, type, payload, baseSnapshotSeq = 0) {
  return request("/api/proposals", {
    token,
    method: "POST",
    body: { id, type, payload, baseSnapshotSeq },
  });
}

before(async () => {
  const memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memoryDatabase.adapters.createPg();
  pool = new adapter.Pool();
  await runMigrations({ db: pool });
  await pool.query("INSERT INTO teams (id, name) VALUES ('sync-team', 'Sync Team')");
  const passwordHash = await bcrypt.hash(PASSWORD, TEST_CONFIG.bcryptRounds);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, role, status, team_id)
     VALUES ('sync-admin', 'sync.admin', $1, 'Sync Admin', 'central_admin', 'Active', 'sync-team'),
            ('sync-worker', 'sync.worker', $1, 'Sync Worker', 'field_worker', 'Active', 'sync-team')`,
    [passwordHash],
  );
  const app = createApp({ db: pool, config: TEST_CONFIG, logger: { error() {} } });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  adminToken = await login("sync.admin");
  workerToken = await login("sync.worker");
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await pool.end();
});

test("authenticated clients fetch complete sequence-bearing snapshots", async () => {
  const response = await request("/api/snapshot", { token: workerToken });
  assert.equal(response.status, 200);
  const snapshot = await response.json();
  assert.equal(snapshot.snapshotSeq, 0);
  assert.ok(snapshot.generatedAt);
  assert.deepEqual(Object.keys(snapshot.data).sort(), [
    "inventory", "mapPins", "notifications", "reports", "stockLog",
    "tasks", "teams", "users", "warehouses",
  ]);
  assert.equal(snapshot.data.users.find((user) => user.id === "sync-worker").teamId, "sync-team");
});

test("proposal submission is idempotent and approval advances the snapshot", async () => {
  const report = {
    id: "sync-report", type: "Flood", district: "Dhaka",
    location: { lat: 23.81, lng: 90.41 }, severity: 4,
    time: "2026-08-25T10:00:00.000Z",
    description: "Flooding reported by synchronization test", affectedCount: 25,
  };
  const first = await submit(workerToken, "proposal-add-report", "ADD_REPORT", report);
  assert.equal(first.status, 201);
  assert.equal((await first.json()).duplicate, false);
  const duplicate = await submit(workerToken, "proposal-add-report", "ADD_REPORT", report);
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).duplicate, true);

  assert.equal((await request("/api/proposals", { token: workerToken })).status, 403);
  const list = await request("/api/proposals", { token: adminToken });
  assert.equal(list.status, 200);
  assert.equal((await list.json()).proposals[0].userName, "Sync Worker");

  const accepted = await request("/api/proposals/proposal-add-report/decision", {
    token: adminToken, method: "POST", body: { decision: "Accepted" },
  });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).proposal.status, "Accepted");

  const snapshot = await (await request("/api/snapshot", { token: workerToken })).json();
  assert.equal(snapshot.snapshotSeq, 1);
  assert.equal(snapshot.data.reports[0].id, "sync-report");
  assert.equal(snapshot.data.reports[0].reference, "DHK-20260825-0001");
  assert.equal(snapshot.data.reports[0].submittedById, "sync-worker");

  const retryDecision = await request("/api/proposals/proposal-add-report/decision", {
    token: adminToken, method: "POST", body: { decision: "Accepted" },
  });
  assert.equal((await retryDecision.json()).duplicate, true);
  assert.equal((await (await request("/api/snapshot", { token: workerToken })).json()).snapshotSeq, 1);
});

test("first-arrived-wins rejects stale competing proposals", async () => {
  const first = await submit(workerToken, "proposal-report-first", "UPDATE_REPORT", {
    id: "sync-report", patch: { status: "Acknowledged" },
  }, 1);
  const second = await submit(workerToken, "proposal-report-second", "UPDATE_REPORT", {
    id: "sync-report", patch: { status: "Resolved" },
  }, 1);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const outOfOrder = await request("/api/proposals/proposal-report-second/decision", {
    token: adminToken, method: "POST", body: { decision: "Accepted" },
  });
  assert.equal(outOfOrder.status, 409);
  assert.equal((await outOfOrder.json()).code, "PROCESS_EARLIER_FIRST");

  assert.equal((await request("/api/proposals/proposal-report-first/decision", {
    token: adminToken, method: "POST", body: { decision: "Accepted" },
  })).status, 200);
  const conflict = await request("/api/proposals/proposal-report-second/decision", {
    token: adminToken, method: "POST", body: { decision: "Accepted" },
  });
  const conflictBody = await conflict.json();
  assert.equal(conflictBody.proposal.status, "Rejected");
  assert.equal(conflictBody.proposal.conflictState, "conflict");
  assert.match(conflictBody.proposal.rejectionReason, /accepted first/);

  const snapshot = await (await request("/api/snapshot", { token: workerToken })).json();
  assert.equal(snapshot.snapshotSeq, 2);
  assert.equal(snapshot.data.reports[0].status, "Acknowledged");
});

test("explicit rejection is recorded without changing authoritative sequence", async () => {
  await submit(workerToken, "proposal-reject", "UPDATE_REPORT", {
    id: "sync-report", patch: { status: "Resolved" },
  }, 2);
  const response = await request("/api/proposals/proposal-reject/decision", {
    token: adminToken, method: "POST",
    body: { decision: "Rejected", reason: "Insufficient field evidence" },
  });
  const body = await response.json();
  assert.equal(body.proposal.status, "Rejected");
  assert.equal(body.proposal.rejectionReason, "Insufficient field evidence");
  assert.equal((await (await request("/api/snapshot", { token: workerToken })).json()).snapshotSeq, 2);
});

test("Central Admin direct mutations commit authoritatively", async () => {
  assert.equal((await request("/api/authoritative/mutations", {
    token: workerToken, method: "POST",
    body: { type: "UPDATE_REPORT", payload: { id: "sync-report", patch: { status: "Resolved" } } },
  })).status, 403);

  const response = await request("/api/authoritative/mutations", {
    token: adminToken, method: "POST",
    body: { type: "UPDATE_REPORT", payload: { id: "sync-report", patch: { status: "Resolved" } } },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).snapshotSeq, 3);
  const snapshot = await (await request("/api/snapshot", { token: workerToken })).json();
  assert.equal(snapshot.data.reports[0].status, "Resolved");
});
