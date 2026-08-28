import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import { runMigrations } from "../src/db/migrate.js";
import { SyncError, SyncService } from "../src/sync/service.js";

let pool;
let service;
const actor = { id: "resource-manager", name: "Resource Manager" };

function validResource(overrides = {}) {
  return {
    id: "resource-rice",
    name: "Rice",
    category: "Food",
    qty: 100,
    unit: "kg",
    status: "OK",
    warehouseId: "resource-warehouse",
    stockLog: { id: "stock-create", change: 100, reason: "Restocking" },
    ...overrides,
  };
}

async function resource(id = "resource-rice") {
  return (await service.snapshot()).data.inventory.find((item) => item.id === id);
}

before(async () => {
  const database = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = database.adapters.createPg();
  pool = new adapter.Pool();
  await runMigrations({ db: pool });
  await pool.query("INSERT INTO warehouses (id, name) VALUES ('resource-warehouse', 'Resource Warehouse')");
  await pool.query(
    `INSERT INTO users (id, username, password_hash, name, email, role, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actor.id, "resource.manager", "not-used-by-service-tests", actor.name, "resource.manager@reliefopt.org", "warehouse_manager", "Active"],
  );
  service = new SyncService(pool);
});

after(async () => {
  await pool.end();
});

test("creates an available resource and records its initial stock", async () => {
  const result = await service.direct("ADD_INVENTORY", validResource(), actor);
  assert.equal(result.snapshotSeq, 1);
  assert.deepEqual(
    await resource(),
    {
      id: "resource-rice",
      name: "Rice",
      category: "Food",
      qty: 100,
      unit: "kg",
      status: "OK",
      warehouseId: "resource-warehouse",
      warehouse: "Resource Warehouse",
      lastUpdated: (await resource()).lastUpdated,
    },
  );
  const snapshot = await service.snapshot();
  assert.deepEqual(
    snapshot.data.stockLog.map(({ itemId, change, reason, user }) => ({ itemId, change, reason, user })),
    [{ itemId: "resource-rice", change: 100, reason: "Restocking", user: actor.name }],
  );
});

test("updates resource details, quantity, and availability status", async () => {
  await service.direct("UPDATE_INVENTORY", {
    id: "resource-rice",
    patch: {
      name: "Fortified Rice",
      category: "Food",
      qty: 20,
      unit: "bags",
      status: "Low",
      stockLog: { id: "stock-adjust", change: -80, reason: "Adjustment" },
    },
  }, actor);
  const updated = await resource();
  assert.equal(updated.name, "Fortified Rice");
  assert.equal(updated.qty, 20);
  assert.equal(updated.unit, "bags");
  assert.equal(updated.status, "Low");
  assert.equal((await service.snapshot()).data.stockLog[0].change, -80);
});

test("consumption and restoration calculate remaining quantity and preserve a stock audit trail", async () => {
  await service.direct("UPDATE_ITEM_QTY", {
    itemId: "resource-rice", delta: -15, reason: "Distribution", logId: "stock-consume",
  }, actor);
  assert.equal((await resource()).qty, 5);

  await service.direct("UPDATE_ITEM_QTY", {
    itemId: "resource-rice", delta: 40, reason: "Restocking", logId: "stock-restore",
  }, actor);
  assert.equal((await resource()).qty, 45);
  const changes = (await service.snapshot()).data.stockLog
    .filter((entry) => entry.itemId === "resource-rice")
    .map((entry) => entry.change);
  assert.deepEqual(changes, [40, -15, -80, 100]);
});

test("supports zero availability and prevents consumption beyond available quantity", async () => {
  await service.direct("UPDATE_INVENTORY", {
    id: "resource-rice", patch: { qty: 0, status: "Out of Stock" },
  }, actor);
  assert.equal((await resource()).qty, 0);
  assert.equal((await resource()).status, "Out of Stock");

  const sequence = (await service.snapshot()).snapshotSeq;
  await assert.rejects(
    () => service.direct("UPDATE_ITEM_QTY", {
      itemId: "resource-rice", delta: -1, reason: "Distribution", logId: "stock-too-far",
    }, actor),
    (error) => error instanceof SyncError && error.status === 404 && error.code === "RECORD_NOT_FOUND",
  );
  assert.equal((await resource()).qty, 0);
  assert.equal((await service.snapshot()).snapshotSeq, sequence);
});

test("rejects invalid resource data, negative quantities, invalid statuses, and missing fields", async () => {
  const invalidCases = [
    ["missing ID", validResource({ id: "" }), /Inventory ID is required/],
    ["empty name", validResource({ id: "resource-empty-name", name: " " }), /Item name is required/],
    ["empty category", validResource({ id: "resource-empty-category", category: "" }), /Category is required/],
    ["empty unit", validResource({ id: "resource-empty-unit", unit: "" }), /Unit is required/],
    ["missing warehouse", validResource({ id: "resource-no-warehouse", warehouseId: null }), /Warehouse is required/],
    ["negative quantity", validResource({ id: "resource-negative", qty: -1 }), /Inventory quantity is invalid/],
    ["non-numeric quantity", validResource({ id: "resource-nan", qty: "many" }), /Inventory quantity is invalid/],
    ["invalid status", validResource({ id: "resource-status", status: "Available" }), /Inventory status is invalid/],
  ];
  for (const [label, input, message] of invalidCases) {
    await assert.rejects(() => service.direct("ADD_INVENTORY", input, actor), {
      name: "SyncError", message,
    }, label);
  }
});

test("rejects missing resources, negative direct updates, and unsupported resource changes", async () => {
  await assert.rejects(
    () => service.direct("UPDATE_INVENTORY", { id: "missing-resource", patch: { qty: 1 } }, actor),
    (error) => error instanceof SyncError && error.status === 404 && error.code === "RECORD_NOT_FOUND",
  );
  await assert.rejects(
    () => service.direct("UPDATE_INVENTORY", { id: "resource-rice", patch: { qty: -1 } }, actor),
    (error) => error instanceof SyncError && error.status === 400 && error.code === "VALIDATION_ERROR",
  );
  await assert.rejects(
    () => service.direct("UPDATE_INVENTORY", { id: "resource-rice", patch: { expiryDate: "2026-12-31" } }, actor),
    (error) => error instanceof SyncError && error.status === 400 && error.code === "VALIDATION_ERROR",
  );
  assert.throws(
    () => service.direct("DELETE_INVENTORY", { id: "resource-rice" }, actor),
    (error) => error instanceof SyncError && error.code === "UNSUPPORTED_PROPOSAL",
  );
});

test("rejects duplicate resources within one warehouse without changing availability", async () => {
  const before = await resource();
  const sequence = (await service.snapshot()).snapshotSeq;
  await assert.rejects(() => service.direct("ADD_INVENTORY", validResource({
    id: "resource-rice-duplicate", name: before.name, qty: 10, stockLog: undefined,
  }), actor));
  assert.equal((await resource()).qty, before.qty);
  assert.equal((await service.snapshot()).snapshotSeq, sequence);
});
