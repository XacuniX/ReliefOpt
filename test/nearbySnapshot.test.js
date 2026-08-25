import test from "node:test";
import assert from "node:assert/strict";
import { AUTHORITATIVE_STORES } from "../src/lib/db.js";
import {
  NearbySnapshotError,
  createNearbySnapshotPayload,
  parseNearbySnapshotPayload,
  sanitizeAuthoritativeSnapshot,
} from "../src/lib/nearbySnapshot.js";

function snapshot(sequence = 7) {
  const data = Object.fromEntries(
    AUTHORITATIVE_STORES.map((store) => [
      store,
      [{ id: `${store}-1`, name: store }],
    ]),
  );
  return {
    snapshotSeq: sequence,
    generatedAt: "2026-08-24T08:30:00.000Z",
    data,
    accessToken: "must-not-transfer",
    proposalOutbox: [{ id: "proposal-secret" }],
  };
}

test("nearby snapshot payload contains only approved authoritative data", () => {
  const prepared = createNearbySnapshotPayload(snapshot());
  const envelope = JSON.parse(prepared.payload);

  assert.equal(envelope.snapshot.snapshotSeq, 7);
  assert.equal(envelope.snapshot.accessToken, undefined);
  assert.equal(envelope.snapshot.proposalOutbox, undefined);
  assert.deepEqual(Object.keys(envelope.snapshot.data), AUTHORITATIVE_STORES);
  assert.equal(parseNearbySnapshotPayload(prepared.payload, 6).snapshotSeq, 7);
});

test("nearby snapshot rejects stale or duplicate sequences", () => {
  const prepared = createNearbySnapshotPayload(snapshot(7));
  assert.throws(
    () => parseNearbySnapshotPayload(prepared.payload, 7),
    (error) =>
      error instanceof NearbySnapshotError &&
      error.code === "SNAPSHOT_NOT_NEWER",
  );
});

test("nearby snapshot rejects incomplete authoritative data", () => {
  const incomplete = snapshot();
  delete incomplete.data.reports;
  assert.throws(
    () => sanitizeAuthoritativeSnapshot(incomplete),
    /missing reports data/i,
  );
});

test("nearby snapshot rejects records without stable identifiers", () => {
  const invalid = snapshot();
  invalid.data.tasks = [{ title: "No ID" }];
  assert.throws(
    () => sanitizeAuthoritativeSnapshot(invalid),
    /invalid tasks records/i,
  );
});
