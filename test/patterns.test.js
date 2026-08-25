import test from "node:test";
import assert from "node:assert/strict";
import { operationalEvents } from "../src/lib/operationalEvents.js";
import { SyncFacade } from "../src/lib/syncFacade.js";
import { canTransition } from "../src/lib/workflowState.js";
import { calculateUrgency } from "../src/lib/urgency.js";
import { optimize } from "../src/lib/packing.js";

test("state pattern only permits defined workflow transitions", () => {
  assert.equal(canTransition("report", "Pending", "Acknowledged"), true);
  assert.equal(canTransition("report", "Pending", "Resolved"), false);
});

test("strategies preserve the default urgency and packing behaviour", () => {
  assert.equal(calculateUrgency({ daysWithoutFood: 4 }, "ruleBased").score, 25);
  assert.throws(() => calculateUrgency({}, "unknown"), /Unknown urgency strategy/);
  assert.throws(() => optimize({}, [], "unknown"), /Unknown packing strategy/);
});

test("facade decorator publishes observer events", async () => {
  const events = [];
  const unsubscribe = operationalEvents.subscribe((event) => events.push(event.type));
  const facade = new SyncFacade({
    fetchSnapshot: async () => ({ snapshotSeq: 1 }),
    submitProposal: async () => ({}),
    commitAuthoritativeMutation: async () => ({}),
  });
  await facade.pullSnapshot("token");
  unsubscribe();
  assert.deepEqual(events, ["operation.started", "operation.succeeded"]);
});
