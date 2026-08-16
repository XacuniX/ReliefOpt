import { createContext, useContext, useEffect, useState } from "react";
import { getAll, put, remove, seedOnce } from "../lib/db";

const DataContext = createContext(null);

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
      try {
        await seedOnce();
      } catch (err) {
        console.error("seedOnce failed:", err);
      }
      const entries = await Promise.all(STORES.map(async (store) => [store, await getAll(store)]));
      if (cancelled) return;
      setState(Object.fromEntries(entries));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateStore(store, updater) {
    setState((prev) => {
      const next = updater(prev[store]);
      // Persist every record in the new array. If the array shrank, the
      // records that disappeared are deleted from IndexedDB too.
      for (const item of next) {
        if (item && item.id) put(store, item).catch((err) => console.error(`put(${store}) failed:`, err));
      }
      if (next.length < prev[store].length) {
        const ids = new Set(next.map((item) => item.id));
        for (const item of prev[store]) {
          if (!ids.has(item.id)) {
            remove(store, item.id).catch((err) => console.error(`remove(${store}) failed:`, err));
          }
        }
      }
      return { ...prev, [store]: next };
    });
  }

  const value = {
    ready,
    reports: state.reports,
    tasks: state.tasks,
    inventory: state.inventory,
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
      // RKN calls this with incoming peer data. Entry shape:
      //   { id, actionType, payload, ... }
      const payload = entry?.payload ?? entry;
      const store = {
        report: "reports",
        task: "tasks",
        item: "inventory",
        inventory: "inventory",
        user: "users",
        team: "teams",
        notification: "notifications",
        mapPin: "mapPins",
      }[entry?.store] || entry?.store;

      switch (entry?.actionType) {
        case "ADD":
          if (store) updateStore(store, (p) => [payload, ...p]);
          break;
        case "UPDATE":
          if (store && payload?.id) {
            updateStore(store, (p) =>
              p.map((record) => (record.id === payload.id ? { ...record, ...payload } : record))
            );
          }
          break;
        case "DELETE":
          if (store && payload?.id) updateStore(store, (p) => p.filter((record) => record.id !== payload.id));
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
