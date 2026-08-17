import { createContext, useContext, useEffect, useState } from "react";
import { getAll, put, remove, seedOnce } from "../lib/db";

const DataContext = createContext(null);

// Shadow copy of the entire state in localStorage. IndexedDB is the source of
// truth, but deleting the database (or the browser evicting it) wipes user
// edits. When a re-seed happens we restore from this shadow so edits survive.
const SHADOW_KEY = "reliefopt-shadow-state";

// All 11 stores (same list as src/lib/db.js). Components read these from
// context; mutations write through to IndexedDB so data survives refreshes.
const STORES = [
  "reports",
  "tasks",
  "inventory",
  "users",
  "teams",
  "warehouses",
  "notifications",
  "stockLog",
  "mapPins",
  "syncQueue",
];

function readShadow() {
  try {
    const raw = localStorage.getItem(SHADOW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeShadow(state) {
  try {
    localStorage.setItem(SHADOW_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — IndexedDB still has the data, so this is
    // only a loss of the delete-database recovery copy.
  }
}

export function DataProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState({
    reports: [],
    tasks: [],
    inventory: [],
    users: [],
    teams: [],
    warehouses: [],
    notifications: [],
    stockLog: [],
    mapPins: [],
    syncQueue: [],
  });

  // On mount: seed once, then hydrate every store from IndexedDB.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let reseeded = false;
      try {
        reseeded = await seedOnce();
      } catch (err) {
        console.error("seedOnce failed:", err);
      }
      let entries = await Promise.all(
        STORES.map(async (store) => [store, await getAll(store)])
      );
      const hydrated = Object.fromEntries(entries);
      // The database was just re-created (deleted or evicted) — recover the
      // user's edits from the localStorage shadow instead of demo-only data.
      if (reseeded) {
        const shadow = readShadow();
        if (shadow && Object.keys(shadow).length) {
          hydrated.reports = shadow.reports || [];
          hydrated.tasks = shadow.tasks || [];
          hydrated.inventory = shadow.inventory || [];
          hydrated.users = shadow.users || [];
          hydrated.teams = shadow.teams || [];
          hydrated.warehouses = shadow.warehouses || [];
          hydrated.notifications = shadow.notifications || [];
          hydrated.stockLog = shadow.stockLog || [];
          hydrated.mapPins = shadow.mapPins || [];
          hydrated.syncQueue = shadow.syncQueue || [];
        }
      }
      if (cancelled) return;
      setState(hydrated);
      writeShadow(hydrated);
      if (reseeded) persistState(hydrated);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Writes every store of the given state back into IndexedDB. Used right
  // after restoring from the localStorage shadow, so the recovery is durable.
  function persistState(st) {
    for (const store of STORES) {
      for (const item of st[store] || []) {
        if (item && item.id) {
          put(store, item).catch((err) => console.error(`put(${store}) failed:`, err));
        }
      }
    }
  }

  function updateStore(store, updater) {
    setState((prev) => {
      const next = updater(prev[store]);
      // Persist every record in the new array. If the array shrank, the
      // records that disappeared are deleted from IndexedDB too.
      for (const item of next) {
        if (item && item.id) {
          put(store, item).catch((err) => console.error(`put(${store}) failed:`, err));
        }
      }
      if (next.length < prev[store].length) {
        const ids = new Set(next.map((item) => item.id));
        for (const item of prev[store]) {
          if (!ids.has(item.id)) {
            remove(store, item.id).catch((err) => console.error(`remove(${store}) failed:`, err));
          }
        }
      }
      const result = { ...prev, [store]: next };
      writeShadow(result);
      return result;
    });
  }

  const enrichedReports = state.reports.map((r) => ({
    ...r,
    submittedBy:
      state.users.find((u) => u.id === r.submittedById)?.name ??
      r.submittedBy ??
      "Unknown",
  }));

  const enrichedInventory = state.inventory.map((i) => ({
    ...i,
    warehouse:
      state.warehouses.find((w) => w.id === i.warehouseId)?.name ??
      i.warehouse ??
      "Unknown",
  }));

  function getWarehouseInventory(id) {
    return state.inventory.filter((i) => i.warehouseId === id);
  }

  function getLowStockItems(id) {
    return getWarehouseInventory(id).filter((i) => i.qty < 20);
  }

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

    addReport: (r) => updateStore("reports", (p) => [r, ...p]),
    updateReport: (id, patch) =>
      updateStore("reports", (p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    addTask: (t) => updateStore("tasks", (p) => [t, ...p]),
    updateTask: (id, patch) =>
      updateStore("tasks", (p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    addItem: (item) => updateStore("inventory", (p) => [item, ...p]),
    updateItem: (id, patch) =>
      updateStore("inventory", (p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    addUser: (user) => updateStore("users", (p) => [user, ...p]),
    updateUser: (id, patch) =>
      updateStore("users", (p) => p.map((u) => (u.id === id ? { ...u, ...patch } : u))),
    deactivateUser: (id) =>
      updateStore("users", (p) =>
        p.map((u) => (u.id === id ? { ...u, status: "Inactive" } : u))
      ),
    addStockLog: (entry) => updateStore("stockLog", (p) => [entry, ...p]),
    getWarehouseInventory,
    getLowStockItems,
    updateItemQty: (id, delta, reason, userName) => {
      const entry = {
        id: crypto.randomUUID(),
        itemId: id,
        change: delta,
        reason,
        user: userName,
        timestamp: new Date().toISOString(),
      };
      // Enrich with the item name so StockLog can display and search it.
      const item = state.inventory.find((i) => i.id === id);
      if (item) entry.itemName = item.name;
      updateStore("inventory", (p) =>
        p.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
      );
      updateStore("stockLog", (p) => [entry, ...p]);
    },
    markNotificationRead: (id) =>
      updateStore("notifications", (p) =>
        p.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
      ),
    addMapPin: (pin) => updateStore("mapPins", (p) => [pin, ...p]),

    // sync queue — RKN uses these, YSR makes them persist
    enqueueSync: (entry) => updateStore("syncQueue", (p) => [...p, entry]),
    updateSyncEntry: (id, patch) =>
      updateStore("syncQueue", (p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e))),
    clearSyncEntry: (id) => updateStore("syncQueue", (p) => p.filter((e) => e.id !== id)),
    applyRemoteChange: (entry) => {
      // RKN calls this with incoming peer data. Entry shape (see contracts.js):
      //   { id, actionType, payload, status, timestamp }
      // actionTypes: ADD_REPORT | ADD_TASK | MOVE_TASK | UPDATE_ITEM_QTY | ADD_MAP_PIN ...
      const payload = entry?.payload ?? entry;
      switch (entry?.actionType) {
        case "ADD_REPORT":
          if (payload?.id) updateStore("reports", (p) => [payload, ...p]);
          break;
        case "ADD_TASK":
          if (payload?.id) updateStore("tasks", (p) => [payload, ...p]);
          break;
        case "MOVE_TASK":
          if (payload?.id && payload?.status) {
            updateStore("tasks", (p) =>
              p.map((t) => (t.id === payload.id ? { ...t, status: payload.status } : t))
            );
          }
          break;
        case "UPDATE_ITEM_QTY":
          if (payload?.itemId && typeof payload?.delta === "number") {
            updateStore("inventory", (p) =>
              p.map((i) => (i.id === payload.itemId ? { ...i, qty: i.qty + payload.delta } : i))
            );
            const item = state.inventory.find((i) => i.id === payload.itemId);
            updateStore("stockLog", (p) => [
              {
                id: crypto.randomUUID(),
                itemId: payload.itemId,
                itemName: item?.name,
                change: payload.delta,
                reason: payload.reason || "Sync",
                user: payload.userName || "Remote",
                timestamp: new Date().toISOString(),
              },
              ...p,
            ]);
          }
          break;
        case "ADD_MAP_PIN":
          if (payload?.id) updateStore("mapPins", (p) => [payload, ...p]);
          break;
        default:
          // Unknown action — drop it silently rather than corrupting state.
          break;
      }
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
