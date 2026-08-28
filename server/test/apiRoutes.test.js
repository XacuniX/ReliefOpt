import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createAuthRouter } from "../src/auth/routes.js";
import { createSyncRouter } from "../src/sync/routes.js";
import { SyncError } from "../src/sync/service.js";
import { createTeamRouter, createUserRouter } from "../src/users/routes.js";
import { UserManagementError } from "../src/users/service.js";

let server;
let origin;

function requireAuth(request, response, next) {
  const identity = request.get("x-test-user");
  if (!identity) return response.status(401).json({ error: "Authentication required." });
  request.auth = { user: { id: identity, role: request.get("x-test-role") || "field_worker" } };
  return next();
}

function requireAdmin(request, response, next) {
  if (request.auth?.user?.role !== "central_admin") return response.status(403).json({ error: "Forbidden." });
  return next();
}

const users = [{ id: "user-1", username: "field", role: "field_worker" }];
const proposals = [];

const userService = {
  async listUsers() { return users; },
  async listTeams() { return [{ id: "team-1", name: "First Team" }]; },
  async createTeam(input) {
    if (!input?.name) throw new UserManagementError(400, "VALIDATION_ERROR", "Team name is required.");
    return { id: "team-2", name: input.name, status: input.status || "Standby", location: input.location || null };
  },
  async deleteTeam(id) {
    if (id === "missing") throw new UserManagementError(404, "TEAM_NOT_FOUND", "Team not found.");
    return { deleted: true, unassignedUserIds: ["user-1"] };
  },
  async updateUser(id, input) {
    if (id === "missing") throw new UserManagementError(404, "USER_NOT_FOUND", "User not found.");
    if (id === "broken") throw new Error("database unavailable");
    return { id, ...input };
  },
  async deactivateUser(id) { return { id, status: "Inactive" }; },
};

const syncService = {
  async snapshot() { return { snapshotSeq: 7, generatedAt: "2026-08-26T00:00:00.000Z", data: { reports: [] } }; },
  async submit(input, actor) {
    if (!input?.id) throw new SyncError(400, "VALIDATION_ERROR", "Proposal ID is required.");
    if (input.id === "bad") throw new SyncError(400, "VALIDATION_ERROR", "Invalid proposal.");
    const duplicate = input.id === "duplicate";
    const proposal = { id: input.id, status: "Pending", submittedById: actor.id };
    if (!duplicate) proposals.push(proposal);
    return { duplicate, proposal };
  },
  async list() { return proposals; },
  async decide(id, input) {
    if (id === "missing") throw new SyncError(404, "PROPOSAL_NOT_FOUND", "Proposal not found.");
    return { proposal: { id, status: input?.decision || "Pending" } };
  },
  async direct(type, payload) {
    if (type !== "ADD_REPORT") throw new SyncError(400, "UNSUPPORTED_PROPOSAL", "Unsupported proposal type.");
    return { snapshotSeq: 8, applied: { type, payload } };
  },
};

const authService = {
  async authenticate(username, password) {
    if (username === "failure") throw new Error("identity provider unavailable");
    if (username !== "field" || password !== "valid password") {
      const { AuthenticationError } = await import("../src/auth/service.js");
      throw new AuthenticationError();
    }
    return { accessToken: "mock.jwt.token", expiresAt: "2026-08-27T00:00:00.000Z", user: users[0] };
  },
};

function request(path, { headers = {}, body, ...options } = {}) {
  return fetch(`${origin}${path}`, {
    ...options,
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/auth", createAuthRouter({ authService, requireAuth, rateLimitWindowMs: 60_000, rateLimitMax: 100 }));
  app.use("/users", createUserRouter({ service: userService, requireAuth, requireAdmin }));
  app.use("/teams", createTeamRouter({ service: userService, requireAuth, requireAdmin }));
  app.use("/sync", createSyncRouter({ service: syncService, requireAuth, requireAdmin }));
  app.use((error, _request, response, _next) => response.status(500).json({ error: "Internal server error" }));
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); });

const adminHeaders = { "x-test-user": "admin-1", "x-test-role": "central_admin" };
const workerHeaders = { "x-test-user": "worker-1", "x-test-role": "field_worker" };

test("auth routes return the session contract and reject missing, invalid, and provider-failure credentials", async () => {
  const success = await request("/auth/login", { method: "POST", body: { username: "field", password: "valid password" } });
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), { accessToken: "mock.jwt.token", expiresAt: "2026-08-27T00:00:00.000Z", user: users[0] });
  assert.equal((await request("/auth/login", { method: "POST", body: { username: "field" } })).status, 400);
  assert.equal((await request("/auth/login", { method: "POST", body: { username: "field", password: "wrong" } })).status, 401);
  assert.equal((await request("/auth/login", { method: "POST", body: { username: "failure", password: "valid password" } })).status, 500);
  const me = await request("/auth/me", { headers: workerHeaders });
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { user: { id: "worker-1", role: "field_worker" } });
});

test("user and team routes enforce authentication/admin authorization and preserve response contracts", async () => {
  assert.equal((await request("/users")).status, 401);
  assert.equal((await request("/users", { headers: workerHeaders })).status, 403);
  assert.deepEqual(await (await request("/users", { headers: adminHeaders })).json(), { users });
  assert.deepEqual(await (await request("/teams", { headers: adminHeaders })).json(), { teams: [{ id: "team-1", name: "First Team" }] });
  const createdTeam = await request("/teams", { method: "POST", headers: adminHeaders, body: { name: "New Team", status: "Standby", location: "Dhaka" } });
  assert.equal(createdTeam.status, 201);
  assert.deepEqual(await createdTeam.json(), { team: { id: "team-2", name: "New Team", status: "Standby", location: "Dhaka" } });
  const deletedTeam = await request("/teams/team-1", { method: "DELETE", headers: adminHeaders });
  assert.equal(deletedTeam.status, 200);
  assert.deepEqual(await deletedTeam.json(), { deleted: true, unassignedUserIds: ["user-1"] });
  assert.equal((await request("/users", { method: "POST", headers: adminHeaders, body: { username: "new.user", role: "field_worker" } })).status, 404);
});

test("user routes map validation, duplicate, not-found, and unexpected service errors to HTTP contracts", async () => {
  for (const [path, options, status, code] of [
    ["/teams", { method: "POST", body: {} }, 400, "VALIDATION_ERROR"],
    ["/teams/missing", { method: "DELETE" }, 404, "TEAM_NOT_FOUND"],
    ["/users/missing", { method: "PATCH", body: { name: "Missing" } }, 404, "USER_NOT_FOUND"],
  ]) {
    const response = await request(path, { ...options, headers: adminHeaders });
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
  }
  assert.deepEqual(await (await request("/users/user-1/deactivate", { method: "POST", headers: adminHeaders })).json(), { user: { id: "user-1", status: "Inactive" } });
  assert.equal((await request("/users/user-1/reset-password", { method: "POST", headers: adminHeaders, body: { password: "a sufficiently long password" } })).status, 404);
  assert.equal((await request("/users/broken", { method: "PATCH", headers: adminHeaders, body: { name: "Broken" } })).status, 500);
});

test("sync routes return snapshot, proposal, approval, and authoritative mutation contracts with role checks", async () => {
  assert.equal((await request("/sync/snapshot")).status, 401);
  assert.deepEqual(await (await request("/sync/snapshot", { headers: workerHeaders })).json(), await syncService.snapshot());
  const submitted = await request("/sync/proposals", { method: "POST", headers: workerHeaders, body: { id: "proposal-1" } });
  assert.equal(submitted.status, 201);
  assert.deepEqual(await submitted.json(), { duplicate: false, proposal: { id: "proposal-1", status: "Pending", submittedById: "worker-1" } });
  assert.equal((await request("/sync/proposals", { method: "POST", headers: workerHeaders, body: { id: "duplicate" } })).status, 200);
  assert.equal((await request("/sync/proposals", { headers: workerHeaders })).status, 403);
  assert.deepEqual(await (await request("/sync/proposals", { headers: adminHeaders })).json(), { proposals });
  assert.equal((await request("/sync/proposals/missing/decision", { method: "POST", headers: adminHeaders, body: { decision: "Accepted" } })).status, 404);
  assert.deepEqual(await (await request("/sync/proposals/proposal-1/decision", { method: "POST", headers: adminHeaders, body: { decision: "Accepted" } })).json(), { proposal: { id: "proposal-1", status: "Accepted" } });
  assert.equal((await request("/sync/authoritative/mutations", { method: "POST", headers: workerHeaders, body: { type: "ADD_REPORT", payload: {} } })).status, 403);
  const mutation = await request("/sync/authoritative/mutations", { method: "POST", headers: adminHeaders, body: { type: "ADD_REPORT", payload: { id: "report-1" } } });
  assert.equal(mutation.status, 200);
  assert.deepEqual(await mutation.json(), { snapshotSeq: 8, applied: { type: "ADD_REPORT", payload: { id: "report-1" } } });
});

test("sync routes map validation and unsupported-operation errors without exposing service internals", async () => {
  const invalid = await request("/sync/proposals", { method: "POST", headers: workerHeaders, body: { id: "bad" } });
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "Invalid proposal.", code: "VALIDATION_ERROR" });
  const unsupported = await request("/sync/authoritative/mutations", { method: "POST", headers: adminHeaders, body: { type: "DELETE_REPORT", payload: {} } });
  assert.equal(unsupported.status, 400);
  assert.deepEqual(await unsupported.json(), { error: "Unsupported proposal type.", code: "UNSUPPORTED_PROPOSAL" });
});
