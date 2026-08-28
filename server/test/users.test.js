import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { newDb } from "pg-mem";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/db/migrate.js";
import { TEST_CONFIG } from "../test-support/helpers.js";

const ADMIN_PASSWORD = "admin password 123";
const USER_PASSWORD = "worker password 123";

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
    `INSERT INTO users (id, username, password_hash, name, email, role, status)
     VALUES ('admin-primary', 'primary.admin', $1, 'Primary Admin', 'primary.admin@reliefopt.org', 'central_admin', 'Active')`,
    [passwordHash],
  );
  const workerPasswordHash = await bcrypt.hash(USER_PASSWORD, TEST_CONFIG.bcryptRounds);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, email, role, status, team_id, phone)
     VALUES ('seed-new-worker', 'new.worker', $1, 'New Worker', 'new.worker@reliefopt.org', 'field_worker', 'Active', 'team-alpha', '+8801700000000')`,
    [workerPasswordHash],
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
    `INSERT INTO users (id, username, password_hash, name, email, role, status)
     VALUES ('authorization-worker', 'authorization.worker', $1, 'Authorization Worker', 'authorization.worker@reliefopt.org', 'field_worker', 'Active')`,
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

test("an admin can create a team for later user assignment", async () => {
  const response = await request("/api/teams", {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ name: "Chattogram Response", status: "Standby", location: "Chattogram" }),
  });
  assert.equal(response.status, 201);
  const { team } = await response.json();
  assert.equal(team.name, "Chattogram Response");
  assert.equal(team.status, "Standby");
  assert.equal(team.location, "Chattogram");
  assert.equal(team.leader, "Unassigned");

  const duplicate = await request("/api/teams", {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ name: "chattogram response" }),
  });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).code, "TEAM_NAME_TAKEN");
});

test("admin user creation and password reset endpoints no longer exist", async () => {
  const create = await request("/api/users", {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ username: "should.not.exist", password: USER_PASSWORD, name: "Nope" }),
  });
  assert.equal(create.status, 404);

  const reset = await request("/api/users/seed-new-worker/reset-password", {
    token: adminToken,
    method: "POST",
    body: JSON.stringify({ password: "irrelevant password value" }),
  });
  assert.equal(reset.status, 404);
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
    email: "new.worker@reliefopt.org",
    avatarUrl: null,
    authProvider: "local",
  });
  assert.equal((await request("/api/warehouse/ping", { token: existingSession.accessToken })).status, 200);

  const reportLink = await pool.query("SELECT submitted_by_id FROM reports WHERE id = 'report-user-link'");
  const taskLink = await pool.query("SELECT assigned_user_id FROM tasks WHERE id = 'task-user-link'");
  assert.equal(reportLink.rows[0].submitted_by_id, userId);
  assert.equal(taskLink.rows[0].assigned_user_id, userId);

});

test("a departing leader is reassigned, then cleared when no eligible members remain", async () => {
  const passwordHash = await bcrypt.hash(USER_PASSWORD, TEST_CONFIG.bcryptRounds);
  await pool.query(
    `INSERT INTO teams (id, name, status, location)
     VALUES ('team-leader-test', 'Leader Transfer Team', 'Standby', 'Dhaka')`,
  );
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, email, role, status, team_id)
     VALUES ('team-leader-test-user', 'team.leader', $1, 'Team Leader', 'team.leader@reliefopt.org', 'field_worker', 'Active', 'team-leader-test'),
            ('team-backup-test-user', 'team.backup', $1, 'Backup Member', 'team.backup@reliefopt.org', 'field_worker', 'Active', 'team-leader-test')`,
    [passwordHash],
  );
  await pool.query(
    "UPDATE teams SET leader_id = 'team-leader-test-user' WHERE id = 'team-leader-test'",
  );

  const leaderLeaves = await request("/api/users/team-leader-test-user", {
    token: adminToken,
    method: "PATCH",
    body: JSON.stringify({ teamId: null }),
  });
  assert.equal(leaderLeaves.status, 200);

  let teams = await (await request("/api/teams", { token: adminToken })).json();
  let team = teams.teams.find((entry) => entry.id === "team-leader-test");
  assert.equal(team.leaderId, "team-backup-test-user");
  assert.equal(team.leader, "Backup Member");

  const backupLeaves = await request("/api/users/team-backup-test-user", {
    token: adminToken,
    method: "PATCH",
    body: JSON.stringify({ teamId: null }),
  });
  assert.equal(backupLeaves.status, 200);

  teams = await (await request("/api/teams", { token: adminToken })).json();
  team = teams.teams.find((entry) => entry.id === "team-leader-test");
  assert.equal(team.leaderId, null);
  assert.equal(team.leader, "Unassigned");
});

test("deleting a team unassigns all of its members", async () => {
  const passwordHash = await bcrypt.hash(USER_PASSWORD, TEST_CONFIG.bcryptRounds);
  await pool.query(
    `INSERT INTO teams (id, name, status, location)
     VALUES ('team-delete-test', 'Delete Test Team', 'Standby', 'Dhaka')`,
  );
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, email, role, status, team_id)
     VALUES ('team-delete-member-a', 'delete.member.a', $1, 'Delete Member A', 'delete.member.a@reliefopt.org', 'field_worker', 'Active', 'team-delete-test'),
            ('team-delete-member-b', 'delete.member.b', $1, 'Delete Member B', 'delete.member.b@reliefopt.org', 'field_worker', 'Active', 'team-delete-test')`,
    [passwordHash],
  );

  const response = await request("/api/teams/team-delete-test", {
    token: adminToken,
    method: "DELETE",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    deleted: true,
    unassignedUserIds: ["team-delete-member-a", "team-delete-member-b"],
  });

  const members = await pool.query(
    "SELECT team_id FROM users WHERE id IN ('team-delete-member-a', 'team-delete-member-b') ORDER BY id",
  );
  assert.deepEqual(members.rows.map((row) => row.team_id), [null, null]);
  assert.equal((await pool.query("SELECT id FROM teams WHERE id = 'team-delete-test'")).rowCount, 0);
});

test("admin edits cannot change a user's email or password", async () => {
  const userRow = await pool.query("SELECT id, email FROM users WHERE username = 'renamed.manager'");
  const { id: userId, email: originalEmail } = userRow.rows[0];

  const response = await request(`/api/users/${userId}`, {
    token: adminToken,
    method: "PATCH",
    body: JSON.stringify({
      name: "Renamed Manager Two",
      email: "admin.set@example.com",
      password: "an admin cannot set this",
    }),
  });
  assert.equal(response.status, 200);
  const updated = (await response.json()).user;
  assert.equal(updated.name, "Renamed Manager Two");
  assert.equal(updated.email, originalEmail);

  const stored = await pool.query("SELECT email, password_hash FROM users WHERE id = $1", [userId]);
  assert.equal(stored.rows[0].email, originalEmail);
  assert.equal((await login("renamed.manager", USER_PASSWORD)).status, 200);
});

test("deactivation blocks current authorization and future login", async () => {
  const userRow = await pool.query("SELECT id FROM users WHERE username = 'renamed.manager'");
  const userId = userRow.rows[0].id;
  const activeSession = await (await login("renamed.manager", USER_PASSWORD)).json();
  const response = await request(`/api/users/${userId}/deactivate`, {
    token: adminToken,
    method: "POST",
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.status, "Inactive");
  assert.equal((await request("/api/auth/me", { token: activeSession.accessToken })).status, 401);
  assert.equal((await login("renamed.manager", USER_PASSWORD)).status, 401);
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
