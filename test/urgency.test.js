import test from "node:test";
import assert from "node:assert/strict";
import { calculateUrgency } from "../src/lib/urgency.js";

test("urgency handles missing values without inventing risk", () => {
  const result = calculateUrgency();
  assert.equal(result.score, 0);
  assert.equal(result.zone, "green");
  assert.ok(result.factors.every((factor) => factor.points === 0));
});

test("urgency applies every documented boundary", () => {
  assert.equal(calculateUrgency({ daysWithoutFood: 1 }).score, 8);
  assert.equal(calculateUrgency({ daysWithoutFood: 2 }).score, 15);
  assert.equal(calculateUrgency({ daysWithoutFood: 3 }).score, 20);
  assert.equal(calculateUrgency({ daysWithoutFood: 4 }).score, 25);
  assert.equal(calculateUrgency({ waterLevelFt: 2 }).score, 12);
  assert.equal(calculateUrgency({ waterLevelFt: 4 }).score, 12);
  assert.equal(calculateUrgency({ waterLevelFt: 4.1 }).score, 17);
  assert.equal(calculateUrgency({ waterLevelFt: 6.1 }).score, 20);
  assert.equal(calculateUrgency({ peopleCount: 10 }).score, 8);
  assert.equal(calculateUrgency({ peopleCount: 50 }).score, 13);
  assert.equal(calculateUrgency({ peopleCount: 200 }).score, 17);
  assert.equal(calculateUrgency({ peopleCount: 1000 }).score, 20);
});

test("urgency clamps scores and derives green, amber, and red zones", () => {
  assert.equal(calculateUrgency({ distanceFromAidKm: -999 }).score, 0);
  assert.equal(
    calculateUrgency({ daysWithoutFood: 2, waterLevelFt: 2, peopleCount: 50 })
      .zone,
    "amber",
  );
  const maximum = calculateUrgency({
    daysWithoutFood: 99,
    waterLevelFt: 99,
    peopleCount: 9999,
    childrenPresent: true,
    elderlyPresent: true,
    distanceFromAidKm: 99,
  });
  assert.equal(maximum.score, 100);
  assert.equal(maximum.zone, "red");
});
