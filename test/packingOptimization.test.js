import test from "node:test";
import assert from "node:assert/strict";
import { optimize } from "../src/lib/packing.js";

const vehicle = {
  name: "Allocation Truck",
  length: 2,
  width: 2,
  height: 2,
  maxWeight: 10,
};

function box(overrides = {}) {
  return {
    id: "supply",
    name: "Relief Supply",
    category: "Food",
    length: 50,
    width: 50,
    height: 50,
    weight: 1,
    quantity: 1,
    ...overrides,
  };
}

test("allocates one supply request when dimensions and weight are sufficient", () => {
  const result = optimize(vehicle, [box({ id: "water", name: "Water" })]);
  assert.equal(result.placements.length, 1);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.totalWeight, 1);
  assert.equal(result.fits, true);
  assert.equal(result.placements[0].boxId, "water-1");
});

test("accepts an item that exactly matches remaining weight and vehicle dimensions", () => {
  const exactVehicle = { length: 1, width: 1, height: 1, maxWeight: 10 };
  const result = optimize(exactVehicle, [box({
    id: "exact", length: 100, width: 100, height: 100, weight: 10,
  })]);
  assert.equal(result.placements.length, 1);
  assert.equal(result.totalWeight, 10);
  assert.equal(result.volumeUtilized, 100);
  assert.equal(result.fits, true);
});

test("rejects requests that exceed available weight or physical space", () => {
  const result = optimize(vehicle, [
    box({ id: "heavy", weight: 11 }),
    box({ id: "wide", width: 201 }),
  ]);
  assert.equal(result.placements.length, 0);
  assert.equal(result.rejected.length, 2);
  assert.match(result.rejected.find((item) => item.id === "heavy").reason, /weight limit/);
  assert.match(result.rejected.find((item) => item.id === "wide").reason, /vehicle interior/);
  assert.equal(result.fits, false);
});

test("partially allocates competing supplies and never exceeds capacity", () => {
  const result = optimize(vehicle, [box({
    id: "competing", name: "Medical Kit", category: "Medicine", weight: 4, quantity: 3,
  })]);
  assert.equal(result.placements.length, 2);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.totalWeight, 8);
  assert.ok(result.totalWeight <= vehicle.maxWeight);
  assert.match(result.rejected[0].reason, /weight limit/);
});

test("handles zero vehicle capacity safely while allowing zero-weight supplies", () => {
  const result = optimize({ ...vehicle, maxWeight: 0 }, [
    box({ id: "weightless", weight: 0 }),
    box({ id: "weighted", weight: 0.1 }),
  ]);
  assert.deepEqual(result.placements.map((item) => item.boxId), ["weightless-1"]);
  assert.equal(result.totalWeight, 0);
  assert.match(result.rejected[0].reason, /weight limit of 0 kg/);
});

test("allocates multiple resource categories without creating or altering supply data", () => {
  const requests = [
    box({ id: "food", category: "Food", weight: 1 }),
    box({ id: "medicine", category: "Medicine", weight: 2 }),
    box({ id: "equipment", category: "Equipment", weight: 3 }),
    box({ id: "shelter", category: "Shelter", weight: 4 }),
  ];
  const before = structuredClone(requests);
  const result = optimize(vehicle, requests);
  assert.equal(result.placements.length, 4);
  assert.equal(result.totalWeight, 10);
  assert.deepEqual(requests, before);
  assert.deepEqual(new Set(result.placements.map((item) => item.category)), new Set([
    "Food", "Medicine", "Equipment", "Shelter",
  ]));
});

test("reports invalid, impossible, and empty supply requests without negative allocations", () => {
  const result = optimize(vehicle, [
    box({ id: "zero", quantity: 0 }),
    box({ id: "fraction", quantity: 1.5 }),
    box({ id: "negative-dimension", length: -1 }),
    box({ id: "negative-weight", weight: -1 }),
  ]);
  assert.equal(result.placements.length, 0);
  assert.equal(result.rejected.length, 4);
  assert.ok(result.placements.every((item) => item.weight >= 0));
  assert.ok(result.rejected.some((item) => /positive integer/.test(item.reason)));
  assert.ok(result.rejected.some((item) => /dimensions/.test(item.reason)));
  assert.ok(result.rejected.some((item) => /Weight/.test(item.reason)));
  assert.deepEqual(optimize(vehicle, []), {
    placements: [], rejected: [], volumeUtilized: 0, totalWeight: 0, fits: true,
  });
});

test("produces deterministic unique allocations for repeated and duplicate supply identifiers", () => {
  const requests = [
    box({ id: "duplicate", name: "Rice", quantity: 1 }),
    box({ id: "duplicate", name: "Rice", quantity: 1 }),
    box({ id: "different", name: "Water", quantity: 2 }),
  ];
  const first = optimize(vehicle, requests);
  const second = optimize(vehicle, requests);
  assert.deepEqual(second, first);
  assert.equal(new Set(first.placements.map((item) => item.boxId)).size, first.placements.length);
});

test("rejects unsupported optimization strategies", () => {
  assert.throws(() => optimize(vehicle, [box()], "priority-allocation"), /Unknown packing strategy/);
});
