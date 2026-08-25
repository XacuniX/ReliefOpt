import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  AUTHORITATIVE_STORES,
  applyAuthoritativeSnapshot,
  getAll,
  getMeta,
  put,
  remove,
  seedOnce,
} from "../lib/db";
import { AuthApiError } from "../lib/authApi";
import { createReportReference } from "../lib/reportReference";
import { syncFacade } from "../lib/syncFacade";
import { assertTransition } from "../lib/workflowState";
import { useAuth } from "./AuthContext";
import { useOffline } from "./OfflineContext";

const DataContext = createContext(null);
const SHADOW_KEY = "reliefopt-shadow-state";
const ACTIVE_OUTBOX_STATUSES = new Set(["Queued", "Syncing", "Pending Approval", "Failed"]);

function emptyData() {
  return Object.fromEntries(AUTHORITATIVE_STORES.map((store) => [store, []]));
}

function writeShadow(state) {
  try {
    localStorage.setItem(SHADOW_KEY, JSON.stringify(
      Object.fromEntries(AUTHORITATIVE_STORES.map((store) => [store, state[store] || []])),
    ));
  } catch {
    // IndexedDB remains the durable cache when localStorage is unavailable.
  }
}

function activeOutbox(entries) {
  return entries.filter((entry) => ACTIVE_OUTBOX_STATUSES.has(entry.status));
}

function applyOptimistic(data, type, payload, actor) {
  const next = { ...data };
  switch (type) {
    case "ADD_REPORT":
      next.reports = [{ ...payload, pendingApproval: true }, ...data.reports.filter((item) => item.id !== payload.id)];
      break;
    case "UPDATE_REPORT":
      next.reports = data.reports.map((item) => item.id === payload.id ? { ...item, ...payload.patch, pendingApproval: true } : item);
      break;
    case "ADD_REPORT_NOTE":
      next.reports = data.reports.map((item) => item.id === payload.id
        ? { ...item, pendingApproval: true, notes: [...(item.notes || []), { ...payload.note, authorId: actor?.id, author: actor?.name }] }
        : item);
      break;
    case "ADD_TASK":
      next.tasks = [{ ...payload, pendingApproval: true }, ...data.tasks.filter((item) => item.id !== payload.id)];
      break;
    case "UPDATE_TASK":
      next.tasks = data.tasks.map((item) => item.id === payload.id ? { ...item, ...payload.patch, pendingApproval: true } : item);
      break;
    case "ADD_INVENTORY":
      next.inventory = [{ ...payload, pendingApproval: true }, ...data.inventory.filter((item) => item.id !== payload.id)];
      if (payload.stockLog) next.stockLog = [{ ...payload.stockLog, itemId: payload.id, userId: actor?.id,
        user: actor?.name, pendingApproval: true }, ...data.stockLog];
      break;
    case "UPDATE_INVENTORY":
      next.inventory = data.inventory.map((item) => item.id === payload.id ? { ...item, ...payload.patch, pendingApproval: true } : item);
      if (payload.patch?.stockLog) next.stockLog = [{ ...payload.patch.stockLog, itemId: payload.id,
        userId: actor?.id, user: actor?.name, pendingApproval: true }, ...data.stockLog];
      break;
    case "UPDATE_ITEM_QTY": {
      const item = data.inventory.find((entry) => entry.id === payload.itemId);
      next.inventory = data.inventory.map((entry) => entry.id === payload.itemId
        ? { ...entry, qty: entry.qty + payload.delta, pendingApproval: true, lastUpdated: new Date().toISOString() }
        : entry);
      next.stockLog = [{
        id: payload.logId,
        itemId: payload.itemId,
        itemName: item?.name,
        change: payload.delta,
        reason: payload.reason,
        userId: actor?.id,
        user: actor?.name,
        timestamp: payload.timestamp,
      }, ...data.stockLog.filter((entry) => entry.id !== payload.logId)];
      break;
    }
    case "ADD_STOCK_LOG":
      next.stockLog = [{ ...payload, userId: actor?.id, user: actor?.name, pendingApproval: true },
        ...data.stockLog.filter((entry) => entry.id !== payload.id)];
      break;
    case "ADD_MAP_PIN":
      next.mapPins = [{ ...payload, pendingApproval: true }, ...data.mapPins.filter((item) => item.id !== payload.id)];
      break;
    case "MARK_NOTIFICATION_READ":
      next.notifications = data.notifications.map((item) => item.id === payload.id
        ? { ...item, read: payload.read !== false }
        : item);
      break;
    case "MARK_ALL_NOTIFICATIONS_READ":
      next.notifications = data.notifications.map((item) => ({ ...item, read: true }));
      break;
    default:
      break;
  }
  return next;
}

function optimisticData(authoritative, outbox, actor) {
  return activeOutbox(outbox).reduce(
    (data, entry) => applyOptimistic(data, entry.type, entry.payload, actor),
    authoritative,
  );
}

async function persistCollection(store, next, previous = []) {
  const nextIds = new Set(next.map((item) => item.id));
  await Promise.all([
    ...next.map((item) => put(store, item)),
    ...previous.filter((item) => !nextIds.has(item.id)).map((item) => remove(store, item.id)),
  ]);
}

export function DataProvider({ children }) {
  const { accessToken, currentUser, logout } = useAuth();
  const { isOffline } = useOffline();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState({ ...emptyData(), syncQueue: [] });
  const [snapshotSeq, setSnapshotSeq] = useState(-1);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const stateRef = useRef(state);
  const authoritativeRef = useRef({ snapshotSeq: -1, generatedAt: null, data: emptyData() });
  const syncingRef = useRef(false);

  function replaceState(next) {
    stateRef.current = next;
    setState(next);
    writeShadow(next);
  }

  function replaceOutbox(updater) {
    const previous = stateRef.current.syncQueue;
    const nextOutbox = typeof updater === "function" ? updater(previous) : updater;
    replaceState({ ...stateRef.current, syncQueue: nextOutbox });
    void persistCollection("proposalOutbox", nextOutbox, previous);
    return nextOutbox;
  }

  function replaceDomain(data) {
    replaceState({ ...stateRef.current, ...data });
  }

  function updateDomain(store, updater) {
    const previous = stateRef.current[store] || [];
    const next = updater(previous);
    replaceState({ ...stateRef.current, [store]: next });
    void persistCollection(store, next, previous);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await seedOnce();
        const [entries, outbox, sequenceMeta, syncMeta, cachedSnapshot] = await Promise.all([
          Promise.all(AUTHORITATIVE_STORES.map(async (store) => [store, await getAll(store)])),
          getAll("proposalOutbox"),
          getMeta("snapshotSeq"),
          getMeta("lastSyncedAt"),
          getAll("snapshots"),
        ]);
        if (cancelled) return;
        const cachedData = Object.fromEntries(entries);
        const savedSnapshot = cachedSnapshot.find((item) => item.id === "current");
        const authoritative = savedSnapshot
          ? { snapshotSeq: savedSnapshot.snapshotSeq, generatedAt: savedSnapshot.generatedAt, data: savedSnapshot.data }
          : { snapshotSeq: Number(sequenceMeta?.value ?? -1), generatedAt: syncMeta?.value || null, data: cachedData };
        authoritativeRef.current = authoritative;
        setSnapshotSeq(authoritative.snapshotSeq);
        setLastSyncedAt(syncMeta?.value || authoritative.generatedAt || null);
        replaceState({ ...optimisticData(authoritative.data, outbox, currentUser), syncQueue: outbox });
      } catch (error) {
        console.error("Data cache hydration failed:", error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
    // Hydration runs once; server refresh updates identity-sensitive enrichment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function acceptSnapshot(snapshot, { fromPeer = false, force = false } = {}) {
    if (!Number.isSafeInteger(snapshot?.snapshotSeq) || !snapshot?.data) return false;
    if (!force && snapshot.snapshotSeq <= authoritativeRef.current.snapshotSeq) return false;
    const applied = await applyAuthoritativeSnapshot(snapshot);
    if (!applied) return false;
    authoritativeRef.current = snapshot;
    setSnapshotSeq(snapshot.snapshotSeq);
    const syncedAt = fromPeer ? new Date().toISOString() : (snapshot.generatedAt || new Date().toISOString());
    setLastSyncedAt(syncedAt);
    const outbox = stateRef.current.syncQueue;
    replaceState({ ...optimisticData(snapshot.data, outbox, currentUser), syncQueue: outbox });
    return true;
  }

  async function pullSnapshot({ force = false } = {}) {
    if (!accessToken || isOffline || navigator.onLine === false) return false;
    const snapshot = await syncFacade.pullSnapshot(accessToken);
    const applied = await acceptSnapshot(snapshot, { force });
    if (!applied) setLastSyncedAt(new Date().toISOString());
    return applied;
  }

  async function syncNow() {
    if (syncingRef.current || !ready || !accessToken || isOffline || navigator.onLine === false) return;
    syncingRef.current = true;
    try {
      await pullSnapshot();
      let outbox = stateRef.current.syncQueue;
      for (const entry of activeOutbox(outbox)) {
        replaceOutbox((items) => items.map((item) => item.id === entry.id ? { ...item, status: "Syncing" } : item));
        try {
          const result = await syncFacade.submitProposal(accessToken, {
            id: entry.id,
            type: entry.type,
            payload: entry.payload,
            baseSnapshotSeq: entry.baseSnapshotSeq,
          });
          const proposal = result.proposal;
          if (proposal.status === "Accepted") {
            outbox = replaceOutbox((items) => items.filter((item) => item.id !== entry.id));
          } else if (proposal.status === "Rejected") {
            outbox = replaceOutbox((items) => items.map((item) => item.id === entry.id ? {
              ...item, status: "Rejected", rejectionReason: proposal.rejectionReason,
            } : item));
          } else {
            outbox = replaceOutbox((items) => items.map((item) => item.id === entry.id ? {
              ...item, status: "Pending Approval",
            } : item));
          }
        } catch (error) {
          if (error instanceof AuthApiError && error.code === "INVALID_SESSION") {
            logout();
            return;
          }
          replaceOutbox((items) => items.map((item) => item.id === entry.id ? {
            ...item, status: "Failed", error: error.message,
          } : item));
          if (error instanceof AuthApiError && error.code === "NETWORK_UNAVAILABLE") break;
        }
      }
      await pullSnapshot();
      const currentOutbox = stateRef.current.syncQueue;
      replaceDomain(optimisticData(authoritativeRef.current.data, currentOutbox, currentUser));
    } catch (error) {
      if (error instanceof AuthApiError && error.code === "INVALID_SESSION") logout();
    } finally {
      syncingRef.current = false;
    }
  }

  useEffect(() => {
    if (!ready || !accessToken || isOffline || navigator.onLine === false) return undefined;
    void syncNow();
    const interval = window.setInterval(() => void syncNow(), 30000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, accessToken, isOffline]);

  useEffect(() => {
    if (!ready || !accessToken || isOffline || navigator.onLine === false) return;
    if (activeOutbox(state.syncQueue).length) void syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.syncQueue.length, ready, accessToken, isOffline]);

  async function mutate(type, payload) {
    if (type === "UPDATE_REPORT" && payload.patch?.status) {
      const report = stateRef.current.reports.find((item) => item.id === payload.id);
      if (report) assertTransition("report", report.status, payload.patch.status);
    }
    if (type === "UPDATE_TASK" && payload.patch?.status) {
      const task = stateRef.current.tasks.find((item) => item.id === payload.id);
      if (task) assertTransition("task", task.status, payload.patch.status);
    }
    const entry = {
      id: crypto.randomUUID(),
      type,
      actionType: type,
      payload,
      baseSnapshotSeq: Math.max(0, authoritativeRef.current.snapshotSeq),
      status: "Queued",
      timestamp: new Date().toISOString(),
    };
    replaceDomain(applyOptimistic(stateRef.current, type, payload, currentUser));

    const direct = currentUser?.role === "central_admin" && !isOffline && navigator.onLine !== false;
    if (direct) {
      try {
        await syncFacade.commitMutation(accessToken, type, payload);
        await pullSnapshot();
        return { status: "Accepted", id: entry.id };
      } catch (error) {
        if (error instanceof AuthApiError && error.code !== "NETWORK_UNAVAILABLE") {
          const rejectedEntry = { ...entry, status: "Rejected", rejectionReason: error.message };
          replaceOutbox((items) => [...items, rejectedEntry]);
          await put("proposalOutbox", rejectedEntry);
          await pullSnapshot().catch(() => {});
          throw error;
        }
      }
    }
    replaceOutbox((items) => [...items, entry]);
    await put("proposalOutbox", entry);
    if (!isOffline && navigator.onLine !== false) void syncNow();
    return { status: "Pending Approval", id: entry.id };
  }

  async function applyPeerSnapshot(snapshot) {
    if (!isOffline) return false;
    return acceptSnapshot(snapshot, { fromPeer: true });
  }

  async function applyNearbySnapshot(snapshot) {
    return acceptSnapshot(snapshot, { fromPeer: true });
  }

  function authoritativeSnapshotForPeer() {
    return authoritativeRef.current;
  }

  const enrichedReports = state.reports.map((report) => ({
    ...report,
    submittedBy: state.users.find((user) => user.id === report.submittedById)?.name
      ?? report.submittedBy ?? "Unknown",
  }));
  const enrichedInventory = state.inventory.map((item) => ({
    ...item,
    warehouse: state.warehouses.find((warehouse) => warehouse.id === item.warehouseId)?.name
      ?? item.warehouse ?? "Unknown",
  }));

  const value = {
    ready,
    reports: enrichedReports,
    tasks: state.tasks,
    inventory: enrichedInventory,
    users: state.users,
    teams: state.teams,
    warehouses: state.warehouses,
    notifications: state.notifications,
    stockLog: state.stockLog,
    mapPins: state.mapPins,
    syncQueue: state.syncQueue,
    pendingCount: activeOutbox(state.syncQueue).length,
    snapshotSeq,
    lastSyncedAt,

    addReport: (report) => {
      const payload = { ...report, id: report.id || crypto.randomUUID() };
      return mutate("ADD_REPORT", {
        ...payload,
        reference: report.reference || createReportReference(payload, stateRef.current.reports),
      });
    },
    updateReport: (id, patch) => mutate("UPDATE_REPORT", { id, patch }),
    addReportNote: (id, note) => mutate("ADD_REPORT_NOTE", {
      id, note: { id: note.id || crypto.randomUUID(), text: note.text, timestamp: note.timestamp || new Date().toISOString() },
    }),
    addTask: (task) => mutate("ADD_TASK", { ...task, id: task.id || crypto.randomUUID() }),
    updateTask: (id, patch) => mutate("UPDATE_TASK", { id, patch }),
    addItem: (item) => mutate("ADD_INVENTORY", { ...item, id: item.id || crypto.randomUUID() }),
    updateItem: (id, patch) => mutate("UPDATE_INVENTORY", { id, patch }),
    addStockLog: (entry) => mutate("ADD_STOCK_LOG", { ...entry, id: entry.id || crypto.randomUUID() }),
    replaceUsers: (users) => updateDomain("users", () => users),
    updateItemQty: (id, delta, reason) => mutate("UPDATE_ITEM_QTY", {
      itemId: id, delta, reason, logId: crypto.randomUUID(), timestamp: new Date().toISOString(),
    }),
    markNotificationRead: (id, read = true) => mutate("MARK_NOTIFICATION_READ", { id, read }),
    markAllNotificationsRead: () => mutate("MARK_ALL_NOTIFICATIONS_READ", { userId: currentUser?.id }),
    addMapPin: (pin) => mutate("ADD_MAP_PIN", { ...pin, id: pin.id || crypto.randomUUID() }),

    getWarehouseInventory: (id) => state.inventory.filter((item) => item.warehouseId === id),
    getLowStockItems: (id) => state.inventory.filter((item) => item.warehouseId === id && item.qty < 20),
    enqueueSync: (entry) => replaceOutbox((items) => [...items, entry]),
    updateSyncEntry: (id, patch) => replaceOutbox((items) => items.map((entry) => entry.id === id ? { ...entry, ...patch } : entry)),
    clearSyncEntry: (id) => replaceOutbox((items) => items.filter((entry) => entry.id !== id)),
    drainQueue: syncNow,
    refreshSnapshot: pullSnapshot,
    applyPeerSnapshot,
    applyNearbySnapshot,
    authoritativeSnapshotForPeer,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside <DataProvider>");
  return context;
}
