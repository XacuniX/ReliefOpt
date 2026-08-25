import test from "node:test";
import assert from "node:assert/strict";
import { cn } from "../src/lib/utils.js";
import { canAccessRoute, homeForRole } from "../src/lib/rbac.js";
import {
  createReportReference,
  getDistrictCode,
  getReportDateKey,
  getReportReference,
  getReportReferencePrefix,
} from "../src/lib/reportReference.js";
import { districtCoords, findDistrictName } from "../src/lib/districts.js";
import { findDisasterType } from "../src/lib/disasters.js";
import { extractFields, normaliseDigits } from "../src/lib/extract.js";
import {
  assertTransition,
  allowedTransitions,
  canTransition,
} from "../src/lib/workflowState.js";
import { drainQueue, getStatus, makeEntry } from "../src/lib/sync.js";
import {
  SESSION_KEY,
  clearCachedSession,
  readCachedSession,
  sessionFromAccessToken,
  writeCachedSession,
} from "../src/lib/authSession.js";
import { optimize } from "../src/lib/packing.js";
import { calculateUrgency } from "../src/lib/urgency.js";

function token(claims) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(claims)}.signature`;
}

test("class-name formatter retains meaningful values and drops empty values", () => {
  assert.equal(cn("card", false, null, undefined, "active", ""), "card active");
  assert.equal(cn(), "");
});

test("route and role helpers deny unknown roles, paths, and missing values", () => {
  assert.equal(canAccessRoute(undefined, "/map"), false);
  assert.equal(canAccessRoute("visitor", "/map"), false);
  assert.equal(canAccessRoute("central_admin", "/missing"), false);
  assert.equal(homeForRole(undefined), "/dashboard");
});

test("district coordinates are valid Bangladesh map coordinates", () => {
  for (const [district, [latitude, longitude]] of Object.entries(districtCoords)) {
    assert.ok(latitude >= -90 && latitude <= 90, `${district} latitude is valid`);
    assert.ok(longitude >= -180 && longitude <= 180, `${district} longitude is valid`);
  }
});

test("district parsing handles blank, null, punctuation, aliases, and earliest matches", () => {
  assert.equal(findDistrictName(null), null);
  assert.equal(findDistrictName("   "), null);
  assert.equal(findDistrictName("No location was supplied"), null);
  assert.equal(findDistrictName("Aid needed in coxs-bazaar!"), "Cox's Bazar");
  assert.equal(findDistrictName("Comilla supports Cox's Bazar"), "Cumilla");
});

test("disaster parsing rejects missing and unrelated text and prefers specific aliases", () => {
  assert.equal(findDisasterType(undefined), null);
  assert.equal(findDisasterType(""), null);
  assert.equal(findDisasterType("Need tents, medicine, and food"), null);
  assert.equal(findDisasterType("A factory fire followed a boiler explosion"), "Fire");
  assert.equal(findDisasterType("A boiler explosion caused a fire"), "Explosion");
});

test("report reference helpers format fallback codes, dates, and sequences safely", () => {
  assert.equal(getDistrictCode(null), "UNK");
  assert.equal(getDistrictCode(" new district! "), "NEW");
  assert.equal(getReportDateKey("not-a-date"), getReportDateKey());
  assert.match(getReportDateKey("2026-12-31T18:00:00.000Z"), /^\d{8}$/);
  assert.equal(getReportReferencePrefix({ district: null, time: "2026-01-01T00:00:00Z" }), "UNK-20260101");
  assert.equal(
    createReportReference(
      { district: "Dhaka", time: "2026-01-01T00:00:00Z" },
      [{ reference: "DHK-20260101-9999" }, { reference: "invalid" }],
    ),
    "DHK-20260101-10000",
  );
  assert.equal(getReportReference({ id: "legacy-report" }), "legacy-report");
  assert.equal(getReportReference(null), "—");
});

test("transcript extraction handles null, empty, decimal, and number-word input", () => {
  assert.equal(normaliseDigits(null), "null");
  const empty = extractFields(null);
  assert.equal(empty.transcript, null);
  assert.equal(empty.location, null);
  assert.equal(empty.disasterType, null);
  assert.equal(empty.peopleCount, null);

  const report = extractFields("Twenty-one people in Dhaka face flood water at 2.5 ft without food for zero days");
  assert.equal(report.peopleCount, 21);
  assert.equal(report.waterLevelFt, 2.5);
  assert.equal(report.daysWithoutFood, 0);
  assert.equal(report.disasterType, "Flood");
});

test("workflow helpers expose valid next states and reject invalid or unknown transitions", () => {
  assert.deepEqual(allowedTransitions("report", "Pending"), ["Acknowledged"]);
  assert.deepEqual(allowedTransitions("task", "Completed"), []);
  assert.deepEqual(allowedTransitions("missing", "anything"), []);
  assert.equal(canTransition("missing", "A", "A"), true);
  assert.equal(canTransition("missing", "A", "B"), false);
  assert.doesNotThrow(() => assertTransition("task", "In Progress", "Completed"));
  assert.throws(
    () => assertTransition("task", "Completed", "In Progress"),
    /Cannot move task from 'Completed' to 'In Progress'/,
  );
});

test("sync helpers create replayable entries and derive status from offline and queue state", async () => {
  const entry = makeEntry("ADD_REPORT", { id: "report-1" });
  assert.equal(entry.actionType, "ADD_REPORT");
  assert.deepEqual(entry.payload, { id: "report-1" });
  assert.equal(entry.status, "Queued");
  assert.match(entry.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(getStatus(true, 99), "offline");
  assert.equal(getStatus(false, 1), "pending");
  assert.equal(getStatus(false, 0), "online");

  const changes = [];
  const result = await drainQueue(
    [{ id: "done", status: "Done" }, { id: "ok" }, { id: "bad" }],
    async (item) => {
      if (item.id === "bad") throw new Error("unavailable");
    },
    (id, patch) => changes.push({ id, ...patch }),
  );
  assert.deepEqual(result, { applied: 1, failed: 1 });
  assert.deepEqual(changes, [
    { id: "ok", status: "Syncing" }, { id: "ok", status: "Done" },
    { id: "bad", status: "Syncing" }, { id: "bad", status: "Failed" },
  ]);
});

test("session parser accepts valid unexpired identity claims and rejects malformed claims", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const valid = token({ sub: "u1", username: "field", name: "Field Worker", role: "field_worker", exp: now / 1000 + 60 });
  const session = sessionFromAccessToken(valid, now);
  assert.equal(session?.user.id, "u1");
  assert.equal(session?.user.role, "field_worker");
  assert.equal(sessionFromAccessToken(undefined, now), null);
  assert.equal(sessionFromAccessToken("not.a.jwt", now), null);
  assert.equal(sessionFromAccessToken(token({ sub: "u1", username: "x", name: "X", role: "admin", exp: now / 1000 + 60 }), now), null);
  assert.equal(sessionFromAccessToken(token({ sub: "u1", username: "x", name: "X", role: "field_worker", exp: now / 1000 }), now), null);
});

test("session cache writes valid sessions and safely handles invalid storage data", () => {
  const values = new Map();
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  try {
    const now = Date.now();
    const valid = token({ sub: "u1", username: "field", name: "Field Worker", role: "field_worker", exp: now / 1000 + 60 });
    assert.equal(writeCachedSession(valid).user.username, "field");
    assert.equal(readCachedSession()?.accessToken, valid);
    values.set(SESSION_KEY, "not-json");
    assert.equal(readCachedSession(), null);
    assert.throws(() => writeCachedSession("bad.token.value"), /invalid or expired/);
    clearCachedSession();
    assert.equal(values.has(SESSION_KEY), false);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});

test("resource packing validation rejects missing vehicles, empty boxes, and invalid resource fields", () => {
  assert.deepEqual(optimize(), {
    placements: [], rejected: [], volumeUtilized: 0, totalWeight: 0, fits: true,
  });
  const result = optimize(
    { length: 1, width: 1, height: 1, maxWeight: 10 },
    [
      { name: "missing quantity" },
      { name: "zero weight capacity", length: 1, width: 1, height: 1, weight: 1, quantity: 1 },
      { name: "negative weight", length: 1, width: 1, height: 1, weight: -1, quantity: 1 },
    ],
  );
  assert.equal(result.placements.length, 1);
  assert.match(result.rejected[0].reason, /positive integer/);
  assert.match(result.rejected[1].reason, /Weight/);
});

test("incident urgency handles nulls, zeroes, negative values, and threshold boundaries", () => {
  const unknown = calculateUrgency({
    daysWithoutFood: null, waterLevelFt: null, peopleCount: null,
    childrenPresent: null, elderlyPresent: null, distanceFromAidKm: null,
  });
  assert.equal(unknown.score, 0);
  assert.equal(unknown.factors[0].value, "Unknown");
  assert.equal(calculateUrgency({ peopleCount: 1 }).score, 4);
  assert.equal(calculateUrgency({ peopleCount: 9 }).score, 4);
  assert.equal(calculateUrgency({ peopleCount: 0 }).score, 0);
  assert.equal(calculateUrgency({ waterLevelFt: -1, distanceFromAidKm: -1 }).score, 0);
  assert.equal(calculateUrgency({ daysWithoutFood: 4, peopleCount: 50, waterLevelFt: 2 }).zone, "amber");
  assert.equal(calculateUrgency({ daysWithoutFood: 4, waterLevelFt: 6.1, peopleCount: 1, childrenPresent: true, elderlyPresent: true, distanceFromAidKm: 30 }).zone, "red");
});
