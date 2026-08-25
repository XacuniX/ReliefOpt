import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { runMigrations } from "../src/db/migrate.js";
import { WarehouseRepository } from "../src/db/repository.js";

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;

test(
  "migrations and CRUD work against PostgreSQL",
  { skip: databaseUrl ? false : "Set TEST_DATABASE_URL to a dedicated PostgreSQL test database." },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const warehouses = new WarehouseRepository(pool);
    const id = `integration-${randomUUID()}`;

    try {
      await runMigrations({ db: pool });
      const created = await warehouses.create({
        id,
        name: `Integration Warehouse ${id}`,
        latitude: 23.8103,
        longitude: 90.4125,
      });
      assert.equal((await warehouses.findById(created.id)).name, created.name);

      const updated = await warehouses.update(created.id, { name: `${created.name} Updated` });
      assert.equal(updated.name, `${created.name} Updated`);

      assert.deepEqual(await warehouses.delete(created.id), { id });
      assert.equal(await warehouses.findById(created.id), null);
    } finally {
      await warehouses.delete(id).catch(() => {});
      await pool.end();
    }
  },
);
