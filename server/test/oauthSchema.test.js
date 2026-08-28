import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import { runMigrations } from "../src/db/migrate.js";
import { UserAuthRepository } from "../src/db/repository.js";
import { mapUser, UserManagementRepository } from "../src/users/repository.js";

test("OAuth schema and User repositories support passwordless Google accounts", async (context) => {
  const memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memoryDatabase.adapters.createPg();
  const pool = new adapter.Pool();
  context.after(() => pool.end());
  await runMigrations({ db: pool });

  const users = new UserManagementRepository(pool);
  const created = await users.create({
    id: "oauth-user",
    username: "oauth.user",
    name: "OAuth User",
    email: "oauth.user@example.com",
    googleId: "google-subject-123",
    avatarUrl: "https://example.com/avatar.png",
    authProvider: "google",
    role: "field_worker",
    status: "Active",
    teamId: null,
    phone: null,
  });

  const mapped = mapUser(created);
  assert.equal(mapped.googleId, "google-subject-123");
  assert.equal(mapped.avatarUrl, "https://example.com/avatar.png");
  assert.equal(mapped.authProvider, "google");
  assert.equal((await users.findByGoogleId("google-subject-123")).id, "oauth-user");

  const authUser = await new UserAuthRepository(pool).findByGoogleId("google-subject-123");
  assert.equal(authUser.password_hash, null);
  assert.equal(authUser.google_id, "google-subject-123");

  await assert.rejects(
    users.create({
      id: "oauth-duplicate",
      username: "oauth.duplicate",
      name: "OAuth Duplicate",
      email: "oauth.duplicate@example.com",
      googleId: "google-subject-123",
      authProvider: "google",
      role: "field_worker",
      status: "Active",
      teamId: null,
      phone: null,
    }),
    /unique|duplicate/i,
  );
});

test("User mapping defaults nullable OAuth metadata for local accounts", () => {
  assert.equal(mapUser({ id: "local-user" }).googleId, null);
  assert.equal(mapUser({ id: "local-user" }).avatarUrl, null);
  assert.equal(mapUser({ id: "local-user" }).authProvider, "local");
});
