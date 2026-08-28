import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { createRequireAuth, allowRoles } from "../src/auth/middleware.js";
import { AuthenticationError, AuthService, JwtService } from "../src/auth/service.js";
import { TEST_CONFIG } from "../test-support/helpers.js";

const jwtService = new JwtService({
  secret: TEST_CONFIG.jwtSecret,
  issuer: TEST_CONFIG.jwtIssuer,
  audience: TEST_CONFIG.jwtAudience,
  expiresInSeconds: TEST_CONFIG.jwtExpiresInSeconds,
});

async function invoke(middleware, { authorization, auth } = {}) {
  const response = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  const request = { auth, get: (name) => name === "authorization" ? authorization : undefined };
  let proceeded = false;
  await middleware(request, response, () => { proceeded = true; });
  return { request, response, proceeded };
}

test("authentication accepts normalized valid credentials and returns a public session", async () => {
  const passwordHash = await bcrypt.hash("safe password", TEST_CONFIG.bcryptRounds);
  const user = {
    id: "unit-worker", username: "worker", name: "Unit Worker", email: "worker@reliefopt.org", role: "field_worker",
    status: "Active", auth_version: 4, password_hash: passwordHash,
  };
  const calls = [];
  const service = new AuthService({
    jwtService,
    bcryptRounds: TEST_CONFIG.bcryptRounds,
    userRepository: {
      async findByUsername(username) { calls.push(username); return username === "worker" ? user : null; },
      async updateLastLogin(id) { calls.push(`login:${id}`); },
    },
  });

  const session = await service.authenticate("  WORKER  ", "safe password");
  assert.equal(calls[0], "worker");
  assert.equal(calls[1], "login:unit-worker");
  assert.deepEqual(session.user, {
    id: "unit-worker", username: "worker", name: "Unit Worker", role: "field_worker", status: "Active", teamId: null,
    email: "worker@reliefopt.org",
  });
  assert.equal(jwtService.verify(session.accessToken).av, 4);
});

test("authentication rejects unknown users, wrong passwords, inactive accounts, and invalid roles", async () => {
  const passwordHash = await bcrypt.hash("safe password", TEST_CONFIG.bcryptRounds);
  const users = new Map([
    ["inactive", { id: "inactive", username: "inactive", name: "Inactive", role: "field_worker", status: "Inactive", auth_version: 1, password_hash: passwordHash }],
    ["invalid-role", { id: "invalid-role", username: "invalid-role", name: "Invalid", role: "administrator", status: "Active", auth_version: 1, password_hash: passwordHash }],
  ]);
  const service = new AuthService({
    jwtService,
    bcryptRounds: TEST_CONFIG.bcryptRounds,
    userRepository: { findByUsername: async (name) => users.get(name) || null, updateLastLogin: async () => assert.fail("must not update login") },
  });

  for (const [username, password] of [["missing", "safe password"], ["inactive", "safe password"], ["invalid-role", "safe password"], ["inactive", "wrong"]]) {
    await assert.rejects(() => service.authenticate(username, password), AuthenticationError);
  }
});

test("authentication middleware rejects missing, malformed, expired, invalidated, and unknown-user sessions", async () => {
  const active = {
    id: "active", username: "active", name: "Active", email: "active@reliefopt.org",
    role: "warehouse_manager", status: "Active", auth_version: 2,
  };
  const requireAuth = createRequireAuth({
    jwtService,
    userRepository: { async findById(id) { return id === "active" ? active : null; } },
  });
  const validToken = jwtService.issue({ ...active, authVersion: 2 }).accessToken;
  const expiredToken = jwtService.issue({ ...active, authVersion: 2 }, { expiresInSeconds: -1 }).accessToken;
  const invalidatedToken = jwtService.issue({ ...active, authVersion: 1 }).accessToken;
  const unknownToken = jwtService.issue({ id: "gone", username: "gone", name: "Gone", role: "field_worker", authVersion: 1 }).accessToken;

  for (const authorization of [undefined, "Basic abc", "Bearer", "Bearer forged.token.value", `Bearer ${expiredToken}`, `Bearer ${invalidatedToken}`, `Bearer ${unknownToken}`]) {
    const result = await invoke(requireAuth, { authorization });
    assert.equal(result.response.statusCode, 401);
    assert.equal(result.proceeded, false);
  }

  const valid = await invoke(requireAuth, { authorization: `Bearer ${validToken}` });
  assert.equal(valid.proceeded, true);
  assert.deepEqual(valid.request.auth.user, {
    id: "active", username: "active", name: "Active", role: "warehouse_manager", status: "Active", teamId: null,
    email: "active@reliefopt.org",
  });
});

test("role authorization allows only the configured roles and fails closed for absent or invalid identities", async () => {
  const adminOnly = allowRoles("central_admin");
  for (const role of [undefined, "administrator", "field_worker", "warehouse_manager"]) {
    const result = await invoke(adminOnly, { auth: role ? { user: { role } } : undefined });
    assert.equal(result.response.statusCode, 403);
    assert.equal(result.proceeded, false);
  }
  const admin = await invoke(adminOnly, { auth: { user: { role: "central_admin" } } });
  assert.equal(admin.proceeded, true);
});
