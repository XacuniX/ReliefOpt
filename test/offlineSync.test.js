import test from "node:test";
import assert from "node:assert/strict";
import { drainQueue, makeEntry } from "../src/lib/sync.js";
import { SyncFacade } from "../src/lib/syncFacade.js";
import { operationalEvents } from "../src/lib/operationalEvents.js";

function statusRecorder() {
  const statuses = new Map();
  return {
    statuses,
    update(id, patch) {
      statuses.set(id, { ...(statuses.get(id) || {}), ...patch });
    },
  };
}

test("offline changes retain create, update, delete, and deactivate commands in replayable entries", () => {
  const entries = [
    makeEntry("ADD_REPORT", { id: "offline-report", district: "Dhaka" }),
    makeEntry("UPDATE_REPORT", { id: "offline-report", patch: { severity: 5 } }),
    makeEntry("DELETE_INVENTORY", { id: "offline-item" }),
    makeEntry("DEACTIVATE_TEAM", { id: "offline-team" }),
  ];

  assert.deepEqual(entries.map(({ actionType, payload, status }) => ({ actionType, payload, status })), [
    { actionType: "ADD_REPORT", payload: { id: "offline-report", district: "Dhaka" }, status: "Queued" },
    { actionType: "UPDATE_REPORT", payload: { id: "offline-report", patch: { severity: 5 } }, status: "Queued" },
    { actionType: "DELETE_INVENTORY", payload: { id: "offline-item" }, status: "Queued" },
    { actionType: "DEACTIVATE_TEAM", payload: { id: "offline-team" }, status: "Queued" },
  ]);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
});

test("synchronizing an empty queue does not invoke the transport", async () => {
  let calls = 0;
  const result = await drainQueue([], async () => { calls += 1; });
  assert.deepEqual(result, { applied: 0, failed: 0 });
  assert.equal(calls, 0);
});

test("multiple queued operations are synchronized in insertion order and marked done", async () => {
  const queue = [makeEntry("ADD_REPORT", { id: "one" }), makeEntry("UPDATE_REPORT", { id: "one", patch: { severity: 2 } })];
  const sent = [];
  const recorder = statusRecorder();

  const result = await drainQueue(queue, async (entry) => { sent.push(entry.actionType); }, recorder.update);

  assert.deepEqual(result, { applied: 2, failed: 0 });
  assert.deepEqual(sent, ["ADD_REPORT", "UPDATE_REPORT"]);
  assert.deepEqual([...recorder.statuses.values()].map((entry) => entry.status), ["Done", "Done"]);
});

test("a failed synchronization remains retryable and succeeds after connectivity recovers", async () => {
  const entry = makeEntry("ADD_INVENTORY", { id: "water", quantity: 10 });
  const recorder = statusRecorder();
  let attempts = 0;
  const transport = async () => {
    attempts += 1;
    if (attempts === 1) {
      const error = new Error("network unavailable");
      error.code = "NETWORK_UNAVAILABLE";
      throw error;
    }
  };

  assert.deepEqual(await drainQueue([entry], transport, recorder.update), { applied: 0, failed: 1 });
  assert.equal(recorder.statuses.get(entry.id).status, "Failed");
  assert.deepEqual(await drainQueue([{ ...entry, status: "Failed" }], transport, recorder.update), { applied: 1, failed: 0 });
  assert.equal(recorder.statuses.get(entry.id).status, "Done");
  assert.equal(attempts, 2);
});

test("a partial synchronization failure does not prevent independent queued operations from replaying", async () => {
  const queue = [makeEntry("ADD_REPORT", { id: "first" }), makeEntry("UPDATE_REPORT", { id: "bad" }), makeEntry("ADD_MAP_PIN", { id: "third" })];
  const recorder = statusRecorder();
  const applied = [];

  const result = await drainQueue(queue, async (entry) => {
    if (entry.payload.id === "bad") throw new Error("server error");
    applied.push(entry.payload.id);
  }, recorder.update);

  assert.deepEqual(result, { applied: 2, failed: 1 });
  assert.deepEqual(applied, ["first", "third"]);
  assert.equal(recorder.statuses.get(queue[1].id).status, "Failed");
});

test("duplicate queue entries are replayed deterministically; server idempotency owns deduplication", async () => {
  const entry = makeEntry("ADD_REPORT", { id: "same-record" });
  const calls = [];
  await drainQueue([entry, { ...entry }], async (queued) => { calls.push(queued.id); });
  assert.deepEqual(calls, [entry.id, entry.id]);
});

test("sync facade reports mocked network, timeout, and server failures without making requests", async () => {
  const failures = [];
  const unsubscribe = operationalEvents.subscribe((event) => failures.push(event));
  try {
    for (const code of ["NETWORK_UNAVAILABLE", "TIMEOUT", "SERVER_ERROR"]) {
      const facade = new SyncFacade({
        fetchSnapshot: async () => ({}),
        submitProposal: async () => {
          const error = new Error(code);
          error.code = code;
          throw error;
        },
        commitAuthoritativeMutation: async () => ({}),
      });
      await assert.rejects(() => facade.submitProposal("test-token", { id: code }));
    }
  } finally {
    unsubscribe();
  }
  assert.deepEqual(failures.map((event) => event.name), [
    "sync.submitProposal", "sync.submitProposal",
    "sync.submitProposal", "sync.submitProposal",
    "sync.submitProposal", "sync.submitProposal",
  ]);
  assert.deepEqual(failures.map((event) => event.type), [
    "operation.started", "operation.failed",
    "operation.started", "operation.failed",
    "operation.started", "operation.failed",
  ]);
});
