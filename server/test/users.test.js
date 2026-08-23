import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { newDb } from "pg-mem";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/db/migrate.js";
import { TEST_CONFIG } from "../test-support/helpers.js";

const ADMIN_PASSWORD = "admin password 123";
const USER_PASSWORD = "worker password 123";
const RESET_PASSWORD = "replacement pass 456";
const SECOND_RESET_PASSWORD = "another secure pass 789";

let pool;
let server;
let origin;
let adminToken;

function request(path, { token, ...options } = {}) {
  return fetch(`${origin}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

function login(username, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

before(async () => {
  const memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memoryDatabase.adapters.createPg();
  pool = new adapter.Pool();
  await runMigrations({ db: pool });

  await pool.query(
    `INSERT INTO teams (id, name, status, location)
     VALUES ('team-alpha', 'Alpha Team', 'Standby', 'Dhaka'),
            ('team-bravo', 'Bravo Team', 'Deployed', 'Sylhet')`,
  );
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, TEST_CONFIG.bcryptRounds);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, role, status)
     VALUES ('admin-primary', 'primary.admin', $1, 'Primary Admin', 'central_admin', 'Active')`,
    [passwordHash],
  );

  const app = createApp({ db: pool, config: TEST_CONFIG, logger: { error() {} } });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  adminToken = (await (await login("primary.admin", ADMIN_PASSWORD)).json()).accessToken;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

test("only Central Admin can access user and team administration", async () => {
  const createdHash = await bcrypt.hash(USER_PASSWORD, TEST_CONFIG.bcryptRounds);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, role, status)
     VALUES ('authorization-worker', 'authorization.worker', $1, 'Authorization Worker', 'field_worker', 'Active')`,
    [createdHash],
  );
  const workerToken = (await (await login("authorization.worker", USER_PASSWORD)).json()).accessToken;

  assert.equal((await request("/api/users", { token: workerToken })).status, 403);
  assert.equal((await request("/api/teams", { token: workerToken })).status, 403);
  assert.equal((await request("/api/users", { token: adminToken })).status, 200);

  const teamsResponse = await request("/api/teams", { token: adminToken });
  assert.equal(teamsResponse.status, 200);
  assert.deepEqual(
    (await teamsResponse.json()).teams.map((team) => team.id),
    ["team-alpha", "team-bravo"],
  );
});

test("an admin can create a user who can immediately authenticate", async () => {
  const response = await request("/api/users", {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({
      username: "new.worker",
      password: USER_PASSWORD,
      name: "New Worker",
      role: "field_worker",
      status: "Active",
      teamId: "team-alpha",
      phone: "+8801700000000",
    }),
  });
  assert.equal(response.status, 201);
  const { user } = await response.json();
  assert.equal(user.username, "new.worker");
  assert.equal(user.teamId, "team-alpha");
  assert.equal(user.teamName, "Alpha Team");
  assert.equal(user.password, undefined);
  assert.equal(user.passwordHash, undefined);

  const loginResponse = await login("new.worker", USER_PASSWORD);
  assert.equal(loginResponse.status, 200);
  assert.equal((await loginResponse.json()).user.id, user.id);
});

test("creation rejects weak passwords, unknown teams, and duplicate usernames", async () => {
  const base = {
    username: "invalid.worker",
    name: "Invalid Worker",
    role: "field_worker",
    status: "Active",
    teamId: "team-alpha",
  };
  const weak = await request("/api/users", {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ ...base, password: "short" }),
  });
  assert.equal(weak.status, 400);
  assert.equal((await weak.json()).code, "WEAK_PASSWORD");

  const invalidTeam = await request("/api/users", {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ ...base, password: USER_PASSWORD, teamId: "missing-team" }),
  });
  assert.equal(invalidTeam.status, 400);
  assert.equal((await invalidTeam.json()).code, "INVALID_TEAM");

  const duplicate = await request("/api/users", {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ ...base, username: "new.worker", password: USER_PASSWORD }),
  });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).code, "USERNAME_TAKEN");
});

test("user edits are immediately authoritative and preserve ID-based relationships", async () => {
  const userRow = await pool.query("SELECT id FROM users WHERE username = 'new.worker'");
  const userId = userRow.rows[0].id;
  await pool.query("UPDATE teams SET leader_id = $1 WHERE id = 'team-alpha'", [userId]);
  await pool.query(
    `INSERT INTO reports (
       id, type, severity, submitted_by_id, description, status,
       affected_count, people_count, days_without_food, water_level_ft,
       distance_from_aid_km, urgency_score, urgency_zone
     ) VALUES (
       'report-user-link', 'Flood', 4, $1, 'Relationship test', 'Pending',
       10, 10, 2, 3, 5, 80, 'red'
     )`,
    [userId],
  );
  await pool.query(
    `INSERT INTO tasks (id, title, priority, assigned_user_id)
     VALUES ('task-user-link', 'Deliver supplies', 'High', $1)`,
    [userId],
  );
  const existingSession = await (await login("new.worker", USER_PASSWORD)).json();

  const updateResponse = await request(`/api/users/${userId}`, {
    token: adminToken,
    method: "PATCH",
    body: JSON.stringify({
      username: "renamed.manager",
      name: "Renamed Manager",
      role: "warehouse_manager",
      teamId: "team-bravo",
    }),
  });
  assert.equal(updateResponse.status, 200);
  const updated = (await updateResponse.json()).user;
  assert.equal(updated.id, userId);
  assert.equal(updated.teamId, "team-bravo");

  const meResponse = await request("/api/auth/me", { token: existingSession.accessToken });
  assert.equal(meResponse.status, 200);
  assert.deepEqual((await meResponse.json()).user, {
    id: userId,
    username: "renamed.manager",
    name: "Renamed Manager",
    role: "warehouse_manager",
    status: "Active",
    teamId: "team-bravo",
  });
  assert.equal((await request("/api/warehouse/ping", { token: existingSession.accessToken })).status, 200);

  const teamLink = await pool.query("SELECT leader_id FROM teams WHERE id = 'team-alpha'");
  const reportLink = await pool.query("SELECT submitted_by_id FROM reports WHERE id = 'report-user-link'");
  const taskLink = await pool.query("SELECT assigned_user_id FROM tasks WHERE id = 'task-user-link'");
  assert.equal(teamLink.rows[0].leader_id, userId);
  assert.equal(reportLink.rows[0].submitted_by_id, userId);
  assert.equal(taskLink.rows[0].assigned_user_id, userId);

  const teams = await (await request("/api/teams", { token: adminToken })).json();
  assert.equal(teams.teams.find((team) => team.id === "team-alpha").leader, "Renamed Manager");
});

test("password reset revokes existing tokens and changes login credentials", async () => {
  const userRow = await pool.query("SELECT id FROM users WHERE username = 'renamed.manager'");
  const userId = userRow.rows[0].id;
  const oldSession = await (await login("renamed.manager", USER_PASSWORD)).json();
  const response = await request(`/api/users/${userId}`, {
    token: adminToken,
    method: "PATCH",
    body: JSON.stringify({ password: RESET_PASSWORD }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.id, userId);
  assert.equal((await request("/api/auth/me", { token: oldSession.accessToken })).status, 401);
  assert.equal((await login("renamed.manager", USER_PASSWORD)).status, 401);
  const resetSession = await (await login("renamed.manager", RESET_PASSWORD)).json();

  const dedicatedReset = await request(`/api/users/${userId}/reset-password`, {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ password: SECOND_RESET_PASSWORD }),
  });
  assert.equal(dedicatedReset.status, 200);
  assert.deepEqual(await dedicatedReset.json(), { reset: true });
  assert.equal((await request("/api/auth/me", { token: resetSession.accessToken })).status, 401);
  assert.equal((await login("renamed.manager", SECOND_RESET_PASSWORD)).status, 200);
});

test("deactivation blocks current authorization and future login", async () => {
  const userRow = await pool.query("SELECT id FROM users WHERE username = 'renamed.manager'");
  const userId = userRow.rows[0].id;
  const activeSession = await (await login("renamed.manager", SECOND_RESET_PASSWORD)).json();
  const response = await request(`/api/users/${userId}/deactivate`, {
    token: adminToken,
    method: "POST",
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.status, "Inactive");
  assert.equal((await request("/api/auth/me", { token: activeSession.accessToken })).status, 401);
  assert.equal((await login("renamed.manager", SECOND_RESET_PASSWORD)).status, 401);
});

test("the final active admin cannot remove their own access", async () => {
  const deactivate = await request("/api/users/admin-primary/deactivate", {
    token: adminToken,
    method: "POST",
  });
  assert.equal(deactivate.status, 400);
  assert.equal((await deactivate.json()).code, "SELF_LOCKOUT");

  const changeRole = await request("/api/users/admin-primary", {
    token: adminToken,
    method: "PATCH",
    body: JSON.stringify({ role: "field_worker" }),
  });
  assert.equal(changeRole.status, 400);
  assert.equal((await changeRole.json()).code, "SELF_LOCKOUT");
});
