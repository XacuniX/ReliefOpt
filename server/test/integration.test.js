import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { newDb } from "pg-mem";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/db/migrate.js";
import { SnapshotRepository, WarehouseRepository } from "../src/db/repository.js";
import { seedDemoData } from "../src/db/seed-demo.js";
import { TEST_CONFIG } from "../test-support/helpers.js";

let pool;

before(async () => {
  const memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memoryDatabase.adapters.createPg();
  pool = new adapter.Pool();
  await runMigrations({ db: pool });
});

after(async () => {
  await pool.end();
});

test("migration creates every authoritative table", async () => {
  const expected = [
    "inventory",
    "map_pins",
    "notifications",
    "processed_proposal_ids",
    "proposals",
    "reports",
    "schema_migrations",
    "snapshot_meta",
    "stock_log",
    "tasks",
    "teams",
    "users",
    "warehouses",
  ];
  const result = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
     ORDER BY table_name`,
  );
  assert.deepEqual(result.rows.map((row) => row.table_name), expected);
});

test("migration is idempotent", async () => {
  const result = await runMigrations({ db: pool });
  assert.deepEqual(result.applied, []);
  assert.equal(result.total, 6);
});

test("demo seeding stores bcrypt hashes and is idempotent", async () => {
  const password = "reliefopt";
  assert.deepEqual(await seedDemoData({
    db: pool,
    password,
    bcryptRounds: TEST_CONFIG.bcryptRounds,
  }), { teams: 7, users: 10, warehouses: 5, inventory: 25 });
  await seedDemoData({ db: pool, password, bcryptRounds: TEST_CONFIG.bcryptRounds });

  const result = await pool.query("SELECT password_hash FROM users WHERE username = 'rahim'");
  assert.notEqual(result.rows[0].password_hash, password);
  assert.equal(await bcrypt.compare(password, result.rows[0].password_hash), true);
  assert.equal((await pool.query("SELECT COUNT(*)::int AS count FROM users")).rows[0].count, 10);
});

test("warehouse repository supports CRUD", async () => {
  const warehouses = new WarehouseRepository(pool);
  const created = await warehouses.create({
    id: "warehouse-test",
    name: "Test Warehouse",
    latitude: 23.81,
    longitude: 90.41,
  });
  assert.equal(created.name, "Test Warehouse");

  const found = await warehouses.findById(created.id);
  assert.equal(found.latitude, 23.81);

  const updated = await warehouses.update(created.id, { name: "Updated Warehouse" });
  assert.equal(updated.name, "Updated Warehouse");
  assert.equal((await warehouses.list()).length, 6);

  assert.deepEqual(await warehouses.delete(created.id), { id: created.id });
  assert.equal(await warehouses.findById(created.id), null);
});

test("snapshot sequence starts at zero and advances monotonically", async () => {
  const snapshots = new SnapshotRepository(pool);
  assert.equal(await snapshots.currentSequence(), 0);
  assert.equal(await snapshots.advanceSequence(), 1);
  assert.equal(await snapshots.advanceSequence(), 2);
});

test("health endpoints expose liveness and database readiness", async () => {
  const app = createApp({ db: pool, config: TEST_CONFIG, logger: { error() {} } });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;

  try {
    const live = await fetch(`${origin}/health/live`);
    assert.equal(live.status, 200);
    assert.equal((await live.json()).status, "ok");

    const ready = await fetch(`${origin}/health/ready`);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), {
      status: "ready",
      database: "connected",
      snapshotSeq: 2,
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("readiness fails closed when the database is unavailable", async () => {
  const app = createApp({
    db: { query: async () => { throw new Error("database unavailable"); } },
    config: TEST_CONFIG,
    logger: { error() {} },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/health/ready`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      status: "not_ready",
      database: "unavailable",
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
