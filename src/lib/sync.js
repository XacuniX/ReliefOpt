/** Offline sync queue helpers for replayable client changes. */

/**
 * Builds a queue entry with a real object payload (never a display string).
 * @param {string} actionType e.g. "ADD_REPORT" | "UPDATE_ITEM_QTY" | "MOVE_TASK"
 * @param {Object} payload the replayable change, e.g. { itemId, delta, reason }
 * @returns {import('./contracts').SyncQueueEntry}
 */
export function makeEntry(actionType, payload) {
  return {
    id: crypto.randomUUID(),
    actionType,
    payload,
    status: "Queued",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Replays every queued entry: marks it "Syncing", applies it with applyFn, and
 * removes it on success. updateFn persists status changes. Failing entries are
 * left queued (or marked Failed) so nothing is silently lost.
 * @param {import('./contracts').SyncQueueEntry[]} queue
 * @param {(entry: object) => Promise<void> | void} applyFn
 * @param {(id: string, patch: object) => void} updateFn
 * @returns {Promise<{ applied: number, failed: number }>}
 */
export async function drainQueue(queue, applyFn, updateFn) {
  let applied = 0;
  let failed = 0;
  for (const entry of queue) {
    if (entry.status === "Done") continue;
    updateFn?.(entry.id, { status: "Syncing" });
    try {
      await applyFn(entry);
      updateFn?.(entry.id, { status: "Done" });
      applied += 1;
    } catch {
      updateFn?.(entry.id, { status: "Failed" });
      failed += 1;
    }
  }
  return { applied, failed };
}

/**
 * "online" — connected and nothing pending
 * "pending" — connected but changes are queued
 * "offline" — no network
 */
export function getStatus(isOffline, pendingCount) {
  if (isOffline) return "offline";
  return pendingCount > 0 ? "pending" : "online";
}
