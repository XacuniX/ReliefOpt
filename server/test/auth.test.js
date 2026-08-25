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
  { id: "auth-admin", username: "admin", name: "Admin User", role: "central_admin", status: "Active" },
  { id: "auth-manager", username: "manager", name: "Manager User", role: "warehouse_manager", status: "Active" },
  { id: "auth-worker", username: "worker", name: "Worker User", role: "field_worker", status: "Active" },
  { id: "auth-inactive", username: "inactive", name: "Inactive User", role: "field_worker", status: "Inactive" },
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
      `INSERT INTO users (id, username, password_hash, name, role, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.username, passwordHash, user.name, user.role, user.status],
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
