import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { newDb } from "pg-mem";
import { createApp } from "../src/app.js";
import { JwtService } from "../src/auth/service.js";
import { runMigrations } from "../src/db/migrate.js";
import { TEST_CONFIG } from "../test-support/helpers.js";

const PASSWORD = "correct horse battery staple";
let pool;
let server;
let origin;

const users = [
  { id: "auth-admin", username: "admin", name: "Admin User", email: "admin@reliefopt.org", role: "central_admin", status: "Active" },
  { id: "auth-manager", username: "manager", name: "Manager User", email: "manager@reliefopt.org", role: "warehouse_manager", status: "Active" },
  { id: "auth-worker", username: "worker", name: "Worker User", email: "worker@reliefopt.org", role: "field_worker", status: "Active" },
  { id: "auth-inactive", username: "inactive", name: "Inactive User", email: "inactive@reliefopt.org", role: "field_worker", status: "Inactive" },
];

async function request(path, options = {}) {
  return fetch(`${origin}${path}`, options);
}

async function login(username, password = PASSWORD) {
  return request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

before(async () => {
  const memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memoryDatabase.adapters.createPg();
  pool = new adapter.Pool();
  await runMigrations({ db: pool });
  const passwordHash = await bcrypt.hash(PASSWORD, TEST_CONFIG.bcryptRounds);
  for (const user of users) {
    await pool.query(
      `INSERT INTO users (id, username, password_hash, name, email, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, user.username, passwordHash, user.name, user.email, user.role, user.status],
    );
  }

  const app = createApp({ db: pool, config: TEST_CONFIG, logger: { error() {} } });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

test("active users in every role can log in and receive identity-bearing JWTs", async () => {
  for (const user of users.filter((entry) => entry.status === "Active")) {
    const response = await login(user.username);
    assert.equal(response.status, 200);
    const session = await response.json();
    assert.equal(session.user.id, user.id);
    assert.equal(session.user.role, user.role);
    assert.equal(session.user.password_hash, undefined);
    assert.match(session.accessToken, /^[^.]+\.[^.]+\.[^.]+$/);
    assert.ok(Date.parse(session.expiresAt) > Date.now());
  }
});

test("unknown users, wrong passwords, inactive users, and malformed bodies are rejected", async () => {
  assert.equal((await login("missing")).status, 401);
  assert.equal((await login("admin", "wrong password")).status, 401);
  assert.equal((await login("inactive")).status, 401);
  assert.equal((await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin" }),
  })).status, 400);
});

test("protected endpoints reject missing, forged, expired, and inactive-user tokens", async () => {
  assert.equal((await request("/api/auth/me")).status, 401);

  const validSession = await (await login("admin")).json();
  const forged = `${validSession.accessToken.slice(0, -1)}${validSession.accessToken.endsWith("a") ? "b" : "a"}`;
  assert.equal((await request("/api/auth/me", {
    headers: { authorization: `Bearer ${forged}` },
  })).status, 401);

  const jwtService = new JwtService({
    secret: TEST_CONFIG.jwtSecret,
    issuer: TEST_CONFIG.jwtIssuer,
    audience: TEST_CONFIG.jwtAudience,
    expiresInSeconds: TEST_CONFIG.jwtExpiresInSeconds,
  });
  const expired = jwtService.issue(users[0], { expiresInSeconds: -1 }).accessToken;
  assert.equal((await request("/api/auth/me", {
    headers: { authorization: `Bearer ${expired}` },
  })).status, 401);

  const inactiveToken = jwtService.issue(users[3]).accessToken;
  assert.equal((await request("/api/auth/me", {
    headers: { authorization: `Bearer ${inactiveToken}` },
  })).status, 401);
});

test("authenticated identity is resolved from the database", async () => {
  const session = await (await login("worker")).json();
  const response = await request("/api/auth/me", {
    headers: { authorization: `Bearer ${session.accessToken}` },
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).user, {
    id: "auth-worker",
    username: "worker",
    name: "Worker User",
    role: "field_worker",
    status: "Active",
    teamId: null,
    email: "worker@reliefopt.org",
  });
});

test("server-side authorization enforces the role matrix", async () => {
  const tokens = {};
  for (const roleUser of users.filter((entry) => entry.status === "Active")) {
    tokens[roleUser.role] = (await (await login(roleUser.username)).json()).accessToken;
  }
  const authenticatedGet = (path, role) => request(path, {
    headers: { authorization: `Bearer ${tokens[role]}` },
  });

  assert.equal((await authenticatedGet("/api/admin/ping", "central_admin")).status, 200);
  assert.equal((await authenticatedGet("/api/admin/ping", "warehouse_manager")).status, 403);
  assert.equal((await authenticatedGet("/api/admin/ping", "field_worker")).status, 403);
  assert.equal((await authenticatedGet("/api/warehouse/ping", "central_admin")).status, 200);
  assert.equal((await authenticatedGet("/api/warehouse/ping", "warehouse_manager")).status, 200);
  assert.equal((await authenticatedGet("/api/warehouse/ping", "field_worker")).status, 403);
});

test("public registration creates an unassigned field worker who can immediately authenticate", async () => {
  const response = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "New Registrant",
      email: "new.registrant@example.com",
      username: "new.registrant",
      phone: "+8801700000001",
      password: "a sufficiently long password",
      confirmPassword: "a sufficiently long password",
    }),
  });
  assert.equal(response.status, 201);
  const session = await response.json();
  assert.equal(session.user.role, "field_worker");
  assert.equal(session.user.teamId, null);
  assert.equal(session.user.email, "new.registrant@example.com");
  assert.equal(session.user.password, undefined);
  assert.match(session.accessToken, /^[^.]+\.[^.]+\.[^.]+$/);

  const loginResponse = await login("new.registrant", "a sufficiently long password");
  assert.equal(loginResponse.status, 200);
  assert.equal((await loginResponse.json()).user.id, session.user.id);
});

test("registration rejects mismatched confirmation, weak passwords, and duplicate identifiers", async () => {
  const base = {
    name: "Duplicate Test",
    email: "duplicate.test@example.com",
    username: "duplicate.test",
    password: "a sufficiently long password",
  };
  const mismatched = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...base, confirmPassword: "does not match" }),
  });
  assert.equal(mismatched.status, 400);
  assert.equal((await mismatched.json()).code, "PASSWORD_MISMATCH");

  const weak = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...base, password: "short", confirmPassword: "short" }),
  });
  assert.equal(weak.status, 400);
  assert.equal((await weak.json()).code, "WEAK_PASSWORD");

  const badEmail = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...base, email: "not-an-email", confirmPassword: base.password }),
  });
  assert.equal(badEmail.status, 400);
  assert.equal((await badEmail.json()).code, "VALIDATION_ERROR");

  const created = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...base, confirmPassword: base.password }),
  });
  assert.equal(created.status, 201);

  const duplicateUsername = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...base, email: "another.email@example.com", confirmPassword: base.password }),
  });
  assert.equal(duplicateUsername.status, 409);
  assert.equal((await duplicateUsername.json()).code, "USERNAME_TAKEN");

  const duplicateEmail = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...base, username: "another.username", confirmPassword: base.password }),
  });
  assert.equal(duplicateEmail.status, 409);
  assert.equal((await duplicateEmail.json()).code, "EMAIL_TAKEN");
});

test("self-service account updates require the current password and can change email and password", async () => {
  const session = await (await login("manager")).json();
  const token = session.accessToken;

  const wrongCurrent = await request("/api/auth/me", {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: "manager.new@example.com", currentPassword: "wrong password" }),
  });
  assert.equal(wrongCurrent.status, 401);
  assert.equal((await wrongCurrent.json()).code, "INVALID_CURRENT_PASSWORD");

  const emailChange = await request("/api/auth/me", {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: "manager.new@example.com", currentPassword: PASSWORD }),
  });
  assert.equal(emailChange.status, 200);
  const emailChangeBody = await emailChange.json();
  assert.equal(emailChangeBody.user.email, "manager.new@example.com");
  assert.equal(emailChangeBody.passwordChanged, false);

  const stillValid = await request("/api/auth/me", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(stillValid.status, 200);

  const mismatchedNewPassword = await request("/api/auth/me", {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      currentPassword: PASSWORD,
      newPassword: "a brand new password",
      confirmNewPassword: "does not match",
    }),
  });
  assert.equal(mismatchedNewPassword.status, 400);
  assert.equal((await mismatchedNewPassword.json()).code, "PASSWORD_MISMATCH");

  const passwordChange = await request("/api/auth/me", {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      currentPassword: PASSWORD,
      newPassword: "a brand new password",
      confirmNewPassword: "a brand new password",
    }),
  });
  assert.equal(passwordChange.status, 200);
  assert.equal((await passwordChange.json()).passwordChanged, true);

  assert.equal((await request("/api/auth/me", { headers: { authorization: `Bearer ${token}` } })).status, 401);
  assert.equal((await login("manager", PASSWORD)).status, 401);
  assert.equal((await login("manager", "a brand new password")).status, 200);
});
