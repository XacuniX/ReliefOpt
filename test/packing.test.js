import test from "node:test";
import assert from "node:assert/strict";
import { optimize } from "../src/lib/packing.js";

const vehicle = {
  name: "Test Vehicle",
  length: 4,
  width: 2,
  height: 2,
  maxWeight: 1000,
};

test("cargo quantity expands to exactly the requested number of candidates", () => {
  const result = optimize(vehicle, [
    {
      id: "box",
      name: "Food",
      category: "Food",
      length: 50,
      width: 50,
      height: 50,
      weight: 10,
      quantity: 7,
    },
  ]);
  assert.equal(result.placements.length + result.rejected.length, 7);
  assert.equal(
    new Set(result.placements.map((box) => box.boxId)).size,
    result.placements.length,
  );
});

test("cargo rejects invalid quantities, dimensions, weights, and overweight boxes with reasons", () => {
  assert.match(
    optimize(vehicle, [{ id: "q", name: "Q", quantity: 0 }]).rejected[0].reason,
    /positive integer/,
  );
  assert.match(
    optimize(vehicle, [
      {
        id: "d",
        name: "D",
        length: -1,
        width: 1,
        height: 1,
        weight: 1,
        quantity: 1,
      },
    ]).rejected[0].reason,
    /dimensions/,
  );
  assert.match(
    optimize(vehicle, [
      {
        id: "w",
        name: "W",
        length: 1,
        width: 1,
        height: 1,
        weight: -1,
        quantity: 1,
      },
    ]).rejected[0].reason,
    /Weight/,
  );
  assert.match(
    optimize(vehicle, [
      {
        id: "h",
        name: "H",
        length: 10,
        width: 10,
        height: 10,
        weight: 1001,
        quantity: 1,
      },
    ]).rejected[0].reason,
    /weight limit/,
  );
});

test("cargo placements remain inside bounds and do not overlap", () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const boxes = Array.from({ length: 8 }, (_, index) => ({
      id: `${seed}-${index}`,
      name: "Box",
      category: "Food",
      length: 15 + ((seed * 13 + index * 7) % 50),
      width: 15 + ((seed * 11 + index * 5) % 40),
      height: 10 + ((seed * 3 + index * 9) % 35),
      weight: 1 + ((seed + index) % 10),
      quantity: 1,
    }));
    const result = optimize(vehicle, boxes);
    assert.ok(result.totalWeight <= vehicle.maxWeight);
    assert.ok(result.volumeUtilized >= 0 && result.volumeUtilized <= 100);
    for (const box of result.placements) {
      assert.ok(box.x >= 0 && box.x + box.width <= vehicle.width * 100);
      assert.ok(box.y >= 0 && box.y + box.depth <= vehicle.length * 100);
      assert.ok(box.z >= 0 && box.z + box.height <= vehicle.height * 100);
    }
    for (let left = 0; left < result.placements.length; left += 1) {
      for (let right = left + 1; right < result.placements.length; right += 1) {
        const a = result.placements[left];
        const b = result.placements[right];
        const overlaps =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.depth &&
          a.y + a.depth > b.y &&
          a.z < b.z + b.height &&
          a.z + a.height > b.z;
        assert.equal(overlaps, false, `${a.boxId} overlaps ${b.boxId}`);
      }
    }
  }
});
