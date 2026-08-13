import { createContext, useContext, useState } from "react";
import * as mock from "../mockData";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [reports, setReports] = useState(mock.reports);
  const [tasks, setTasks] = useState(mock.tasks);
  const [inventory, setInventory] = useState(mock.inventory);
  const [notifications, setNotifications] = useState(mock.notifications);
  const [stockLog, setStockLog] = useState([]);
  const [mapPins, setMapPins] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);

  const value = {
    ready: true,
    reports, tasks, inventory, notifications, stockLog, mapPins, syncQueue,
    users: mock.users, teams: mock.teams, warehouses: [],

    addReport:      (r) => setReports((p) => [r, ...p]),
    updateReport:   (id, patch) => setReports((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r)),
    addTask:        (t) => setTasks((p) => [t, ...p]),
    updateTask:     (id, patch) => setTasks((p) => p.map((t) => t.id === id ? { ...t, ...patch } : t)),
    updateItemQty:  (id, delta, reason, userName) => {
      setInventory((p) => p.map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i));
      setStockLog((p) => [{ id: crypto.randomUUID(), itemId: id, change: delta, reason, user: userName, timestamp: new Date().toISOString() }, ...p]);
    },
    markNotificationRead: (id) => setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: !n.read } : n)),
    addMapPin:      (pin) => setMapPins((p) => [pin, ...p]),

    // sync queue — RKN uses these, YSR makes them persist
    enqueueSync:    (entry) => setSyncQueue((p) => [...p, entry]),
    updateSyncEntry:(id, patch) => setSyncQueue((p) => p.map((e) => e.id === id ? { ...e, ...patch } : e)),
    clearSyncEntry: (id) => setSyncQueue((p) => p.filter((e) => e.id !== id)),
    applyRemoteChange: (entry) => { /* YSR fills this in; RKN calls it for incoming P2P data */ },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
