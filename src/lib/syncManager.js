import { drainQueue, getStatus, makeEntry } from "./sync.js";

/**
 * Facade + Singleton pattern for synchronization.
 * Components use this one object instead of coordinating queue entry creation,
 * replay, and connection-status rules themselves.
 */
class SyncManager {
  enqueue(actionType, payload) {
    return makeEntry(actionType, payload);
  }

  status(isOffline, pendingCount) {
    return getStatus(isOffline, pendingCount);
  }

  async synchronize(queue, applyChange, updateEntry) {
    return drainQueue(queue, applyChange, updateEntry);
  }
}

export const syncManager = new SyncManager();
