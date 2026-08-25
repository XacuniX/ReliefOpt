import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";

const db = await import(`../src/lib/db.js?test=${Date.now()}`);

test("snapshot application is atomic, ordered, and preserves the proposal outbox", async () => {
  await db.put("proposalOutbox", { id: "proposal-1", type: "ADD_REPORT" });
  const data = Object.fromEntries(
    db.AUTHORITATIVE_STORES.map((store) => [store, []]),
  );
  data.reports = [{ id: "report-new", title: "New" }];
  assert.equal(
    await db.applyAuthoritativeSnapshot({
      snapshotSeq: 2,
      generatedAt: "2026-01-01T00:00:00Z",
      data,
    }),
    true,
  );

  const older = structuredClone(data);
  older.reports = [{ id: "report-old", title: "Old" }];
  assert.equal(
    await db.applyAuthoritativeSnapshot({ snapshotSeq: 1, data: older }),
    false,
  );
  assert.deepEqual(
    (await db.getAll("reports")).map((item) => item.id),
    ["report-new"],
  );
  assert.deepEqual(
    (await db.getAll("proposalOutbox")).map((item) => item.id),
    ["proposal-1"],
  );
});

test("cache clear deletes domain data and drafts while retaining outbox", async () => {
  await db.put("drafts", { id: "report", text: "draft" });
  await db.clearDomainCache({ preserveOutbox: true });
  assert.equal((await db.getAll("reports")).length, 0);
  assert.equal((await db.getAll("drafts")).length, 0);
  assert.deepEqual(
    (await db.getAll("proposalOutbox")).map((item) => item.id),
    ["proposal-1"],
  );
});
